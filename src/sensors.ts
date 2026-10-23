import { Accelerometer, Barometer, Gyroscope, LightSensor, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { startSensorSession, type DeviceSensorLike, type SensorSession } from './sensorSession';

export type { SensorSession };

const DEVICE_SENSORS: Record<string, DeviceSensorLike> = {
  accelerometer: Accelerometer as unknown as DeviceSensorLike,
  gyroscope: Gyroscope as unknown as DeviceSensorLike,
  magnetometer: Magnetometer as unknown as DeviceSensorLike,
  barometer: Barometer as unknown as DeviceSensorLike,
  light: LightSensor as unknown as DeviceSensorLike,
};

/** Sensorerfassung mit den Gerätesensoren (expo-sensors) und dem Kompass (expo-location). */
export function startDeviceSensorSession(): Promise<SensorSession> {
  return startSensorSession(DEVICE_SENSORS, listener => Location.watchHeadingAsync(listener), Platform.OS);
}
