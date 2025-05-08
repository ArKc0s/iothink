import React, { useState, useEffect, useRef, useMemo, useCallback, type JSX } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, Space, Select, Row, Col, Empty, Statistic } from 'antd';
import { useParams } from 'react-router-dom';
import { fetchDeviceSensors, fetchSensorData } from '../services/sensorService';
import { useAuth } from '../context/AuthContext';
import { ReloadOutlined } from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { SensorDataPoint } from '../types/SensorDataPoint';
import { PageHeader } from '@ant-design/pro-layout';
import isEqual from 'lodash.isequal';
import type { SensorResponse } from '../types/Sensor';

const { Option } = Select;

const timeRanges = [
  { label: '5 minutes', value: '5m' },
  { label: '15 minutes', value: '15m' },
  { label: '1 heure', value: '1h' },
  { label: '6 heures', value: '6h' },
  { label: '24 heures', value: '24h' },
  { label: '1 semaine', value: '7d' },
  { label: '1 mois', value: '30d' },
  { label: '1 an', value: '365d' }
];

const DeviceDetails: React.FC = () => {
  const { token } = useAuth();
  const { deviceId } = useParams<{ deviceId: string }>();
  const [sensorData, setSensorData] = useState<{ [sensorId: string]: SensorDataPoint[] }>({});
  const [latestData, setLatestData] = useState<{ [sensorId: string]: SensorDataPoint }>({});
  const [timeRange, setTimeRange] = useState<string>('15m');
  const [sensors, setSensors] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  if (!token) {
    throw new Error("Token is required");
  }

  // Chargement des capteurs
  useEffect(() => {
    const loadSensors = async () => {
      try {
        const sensorResponse: SensorResponse = await fetchDeviceSensors(token, deviceId!);

        // Extraction des IDs de capteurs
        const extractedSensors = [...sensorResponse.active, ...sensorResponse.inactive];
        setSensors(extractedSensors);
      } catch (error) {
        console.error("Erreur lors du chargement des capteurs", error);
      }
    };

    loadSensors();
  }, [token, deviceId]);

  // Chargement des données des capteurs
  const loadData = useCallback(async () => {
    try {
      const newData: { [sensorId: string]: SensorDataPoint[] } = {};
      for (const sensorName of sensors) {
        const points = await fetchSensorData(token, deviceId!, sensorName, timeRange);
        newData[sensorName] = points;
      }

      // Optimisation : éviter de faire un set si rien n'a changé
      if (!isEqual(sensorData, newData)) {
        setSensorData(newData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données des capteurs', error);
    }
  }, [token, deviceId, timeRange, sensors, sensorData]);

  // Gestion du polling
  useEffect(() => {
    loadData();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(loadData, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  // WebSocket pour les données en temps réel
  useEffect(() => {
    if (!deviceId || !token) return;
  
    // Générer un identifiant unique pour chaque instance de WebSocket
    const wsId = uuidv4();
    const ws = new WebSocket(`${import.meta.env.VITE_BACKEND_WSS_URL}/ws/sensor?device_id=${deviceId}`, ["access_token", token]);
    
    ws.onopen = () => {
      console.log(`[${wsId}] WebSocket ouvert pour le hub`, deviceId);
      wsRef.current = ws;
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[${wsId}] Données WebSocket reçues`, message);
        const { sensor, value, timestamp } = message;
  
        setLatestData((prev) => {
          const existingData = prev[sensor];
          if (existingData && existingData.timestamp === timestamp && existingData.value === value) {
            // Ignorer les doublons
            return prev;
          }
  
          return {
            ...prev,
            [sensor]: { timestamp, value }
          };
        });
      } catch (error) {
        console.error(`[${wsId}] Erreur de parsing des données WebSocket`, error);
      }
    };
  
    ws.onclose = () => {
      console.log(`[${wsId}] WebSocket fermé pour le hub`, deviceId);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  
    ws.onerror = (error) => {
      console.error(`[${wsId}] Erreur WebSocket pour le hub`, deviceId, error);
      ws.close();
    };
  
    // Nettoyage à la fin du cycle de vie du composant ou changement de `deviceId`
    return () => {
      console.log(`[${wsId}] Nettoyage du WebSocket pour le hub`, deviceId);
      if (wsRef.current === ws) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [deviceId, token]);

  // Préparation des graphiques (useMemo pour éviter les rerenders inutiles)
  const memoizedCharts = useMemo(() => {
    return sensors.reduce((acc, sensorId) => {
      acc[sensorId] = (
        <ResponsiveContainer width="100%" height={300} key={sensorId}>
          <LineChart data={sensorData[sensorId]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={sensorId}
              stroke="#1890ff"
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
      return acc;
    }, {} as { [sensorId: string]: JSX.Element });
  }, [sensors, sensorData]);

  return (
    <div>
      <PageHeader
        title="Données du hub"
        subTitle={deviceId}
        extra={[
          <Space key="controls">
            <Select defaultValue={timeRange} onChange={setTimeRange}>
              {timeRanges.map(range => (
                <Option key={range.value} value={range.value}>
                  {range.label}
                </Option>
              ))}
            </Select>
            <ReloadOutlined key="refresh" onClick={loadData} />
          </Space>
        ]}
        style={{ paddingLeft: 0 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16, marginTop: 16 }}>
        {sensors.map((sensorId, index) => (
          <Col
            key={sensorId}
            xs={24} sm={sensors.length === 1 ? 24 : 12} md={sensors.length === 1 ? 24 : 8} lg={sensors.length === 1 ? 24 : 8} xl={sensors.length === 1 ? 24 : 8}
          >
            <Card
              style={{ height: 150, textAlign: 'center', borderRadius: '8px', backgroundColor: '#f6f8fa' }}
              bordered={false}
            >
              {latestData[sensorId] ? (
                <Statistic
                  title={sensorId.toUpperCase()}
                  value={latestData[sensorId]?.value ?? 0}
                  precision={2}
                  valueStyle={{ fontSize: '24px' }}
                  suffix={sensorId === 'temperature' ? '°C' : sensorId === 'humidity' ? '%' : sensorId === 'pressure' ? 'hPa' : ''}
                />
              ) : (
                <Empty description="Aucune donnée disponible" />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {sensors.map(sensorId => (
          <Col key={sensorId} xs={24} sm={24} md={12} lg={12} xl={12}>
            <Card title={sensorId} bordered={false} style={{ height: 350 }}>
              {sensorData[sensorId] && sensorData[sensorId].length > 0 ? (
                memoizedCharts[sensorId]
              ) : (
                <Empty description="Aucune donnée pour cette période" />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DeviceDetails;
