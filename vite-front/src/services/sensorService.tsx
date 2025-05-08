import apiClient from './apiClient';
import type { SensorsStats } from '../types/SensorsStats';

/*export const fetchDevices = async (token: string): Promise<Device[]> => {
    try {
        const response = await apiClient.get<Device[]>('/devices', {
        headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw error;
    }
};*/

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