import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSensors } from '../core/sensors.mjs';
import { startSensorSession, type DeviceSensorLike, type HeadingSource } from './sensorSession';

type Listener = (data: Record<string, unknown>) => void;

function fakeSensor(options: { available?: boolean; granted?: boolean; fail?: boolean } = {}) {
  const listeners: Listener[] = [];
  let removed = 0;
  const sensor: DeviceSensorLike = {
    isAvailableAsync: async () => { if (options.fail) throw new Error('Sensordienst abgestürzt'); return options.available ?? true; },
    getPermissionsAsync: async () => ({ granted: options.granted ?? true, canAskAgain: true }),
    requestPermissionsAsync: async () => ({ granted: options.granted ?? true }),
    setUpdateInterval: () => undefined,
    addListener: listener => { listeners.push(listener); return { remove: () => { removed++; } }; },
  };
  return { sensor, emit: (data: Record<string, unknown>) => listeners.forEach(l => l(data)), removed: () => removed };
}

test('Sensor-Session vermerkt nicht verfügbare, verweigerte und fehlerhafte Sensoren ausdrücklich', async () => {
  let now = 1_000_000;
  const acc = fakeSensor();
  const gyro = fakeSensor({ available: false });
  const mag = fakeSensor();
  const baro = fakeSensor({ granted: false });
  const light = fakeSensor({ fail: true });
  let headingListener: Parameters<HeadingSource>[0] | null = null;
  const heading: HeadingSource = async listener => { headingListener = listener; return { remove: () => undefined }; };
  const session = await startSensorSession({ accelerometer: acc.sensor, gyroscope: gyro.sensor, magnetometer: mag.sensor, barometer: baro.sensor, light: light.sensor },
    heading, 'android', () => now);
  for (let i = 0; i < 5; i++) { acc.emit({ x: 0.01 * i, y: -1, z: 0, timestamp: 1 }); mag.emit({ x: 20, y: -4, z: -40 }); now += 200; }
  await session.warmUp(0);
  session.markCameraOpened();
  now += 5000;
  session.markCameraReturned();
  acc.emit({ x: 0.5, y: -1, z: 0 });
  headingListener!({ magHeading: 90, trueHeading: -1, accuracy: 2 });
  const block = await session.finish(0) as Record<string, any>;
  assert.equal(block.accelerometer.status, 'recorded');
  assert.equal(block.accelerometer.reading.x, 0.5);
  assert.equal(block.accelerometer.series.length, 6);
  assert.equal(block.gyroscope.status, 'unavailable');
  assert.equal(block.barometer.status, 'permission_denied');
  assert.equal(block.light.status, 'error');
  assert.match(block.light.reason, /abgestürzt/);
  assert.equal(block.compass.status, 'recorded');
  assert.equal(block.compass.reading.trueHeading, null, 'ohne Standortfreigabe kein geografisch Nord');
  assert.equal(block.window.platform, 'android');
  assert.equal(validateSensors(block), null);
  assert.equal(acc.removed(), 1);
  session.stop();
  assert.equal(acc.removed(), 1, 'stop() nach finish() entfernt nichts doppelt');
});

test('iOS ohne Lichtsensor und ohne Kompass wird begründet', async () => {
  const session = await startSensorSession({ light: fakeSensor({ available: false }).sensor }, async () => { throw new Error('Kein Magnetometer'); }, 'ios');
  const block = await session.finish(0) as Record<string, any>;
  assert.match(block.light.reason, /iOS stellt Apps keinen Umgebungslichtsensor/);
  assert.equal(block.compass.status, 'unavailable');
  assert.match(block.compass.reason, /Kein Magnetometer/);
});
