import apiClient from './apiClient';
import type { Device } from '../types/Device';
import type { DevicesStats } from '../types/DevicesStats';

export const fetchDevices = async (token: string): Promise<Device[]> => {
    try {
        const response = await apiClient.get<Device[]>('/devices', {
        headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw error;
    }
} ;

export const fetchDeviceStats = async (token: string): Promise<DevicesStats> => {
    try {
        const response = await apiClient.get<DevicesStats>('/devices/stats', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching device stats:', error);
        throw error;
    }
};