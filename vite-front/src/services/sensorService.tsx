import apiClient from './apiClient';
import type { SensorsStats } from '../types/SensorsStats';
import type { SensorResponse, SensorsResponse } from '../types/Sensor';
import type { SensorDataPoint } from '../types/SensorDataPoint';

export const fetchSensors = async (token: string): Promise<SensorsResponse> => {
    try {
        const response = await apiClient.get<SensorsResponse>('/sensors', {
        headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching sensors:', error);
        throw error;
    }
};

export const fetchDeviceSensors = async (token: string, deviceId: string): Promise<SensorResponse> => {
    try {
        const response = await apiClient.get<SensorResponse>(`/sensors/sensor/${deviceId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching device sensors:', error);
        throw error;
    }
}

export const fetchSensorsStats = async (token: string): Promise<SensorsStats> => {
    try {
        const response = await apiClient.get<SensorsStats>('/sensors/stats', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching device stats:', error);
        throw error;
    }
};

export const fetchSensorData = async (
    token: string | null | undefined,
    deviceId: string,
    sensorName: string,
    range: string,
  ): Promise<SensorDataPoint[]> => {
    const now = new Date().toISOString()
    const start = range === 'now()' ? now : `-${range}`
  
    if (!token) {
      throw new Error('Token is required to fetch sensor data')
    }
  
    const res = await apiClient.get(`/sensors/data/${deviceId}/${sensorName}`, {
      params: {
        start,
        stop: 'now()',
      },
      headers: { Authorization: `Bearer ${token}` },
    })
  
    console.log('Sensor data response:', res.data)
  
    // Correction du format des données
    return res.data.data.map((entry: any) => ({
      timestamp: new Date(entry.time).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      value: entry.value,
      sensor: sensorName,
    }))
  }