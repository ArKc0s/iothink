export interface SensorsResponse {
  [hubId: string]: {
    active: string[]
    inactive: string[]
  }
}

export interface Sensor {
  id: string
  status: 'active' | 'inactive'
  hubId: string
}
