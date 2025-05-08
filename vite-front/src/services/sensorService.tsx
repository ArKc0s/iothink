import apiClient from './apiClient';
import type { SensorsStats } from '../types/SensorsStats';
import type { SensorsResponse } from '../types/Sensor';

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