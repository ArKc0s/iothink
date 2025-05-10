export interface SensorResponse {
  active: string[]
  inactive: string[]
}

export interface SensorsResponse {
  [hubId: string]: SensorResponse
  
}


export interface Sensor {
  id: string
  status: 'active' | 'inactive'
  hubId: string
}
