const { InfluxDB } = require('@influxdata/influxdb-client')

const url = process.env.INFLUX_URL
const token = process.env.INFLUX_TOKEN
const org = process.env.INFLUX_ORG
const bucket = process.env.INFLUX_BUCKET

const client = new InfluxDB({ url, token })
const queryApi = client.getQueryApi(org)

async function getSensorsStatus(device_id, thresholdMinutes = 0.25) {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60_000).toISOString()

  const listFieldsQuery = `
    import "influxdata/influxdb/schema"
    schema.fieldKeys(bucket: "${bucket}", predicate: (r) => r["topic"] == "pico/${device_id}")
  `

  const fields = []
  await new Promise((resolve, reject) => {
    queryApi.queryRows(listFieldsQuery, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row)
        fields.push(o._value)
      },
      error(err) { reject(err) },
      complete() { resolve() }
    })
  })

  const active = []
  const inactive = []

  for (const field of fields) {
    const fieldQuery = `
      from(bucket: "${bucket}")
        |> range(start: -10m)
        |> filter(fn: (r) => r["topic"] == "pico/${device_id}")
        |> filter(fn: (r) => r["_field"] == "${field}")
        |> last()
    `

    const rows = []
    await new Promise((resolve, reject) => {
      queryApi.queryRows(fieldQuery, {
        next(row, tableMeta) {
          rows.push(tableMeta.toObject(row))
        },
        error(err) { reject(err) },
        complete() { resolve() }
      })
    })

    const lastTime = rows[0]?._time
    if (lastTime && new Date(lastTime) > new Date(cutoff)) {
      active.push(field)
    } else {
      inactive.push(field)
    }
  }

  return { active, inactive }
}

async function getSensorData(device_id, sensor_name, start, stop, bucketInterval) {
    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => r["topic"] == "pico/${device_id}")
        |> filter(fn: (r) => r["_field"] == "${sensor_name}")
        |> aggregateWindow(every: ${bucketInterval}, fn: mean, createEmpty: true)
        |> keep(columns: ["_time", "_value"])
        |> sort(columns: ["_time"])
    `
  
    const result = []
    await new Promise((resolve, reject) => {
      queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row)
          result.push({ time: o._time, value: o._value })
        },
        error(err) { reject(err) },
        complete() { resolve() }
      })
    })
  
    return result
  }
  
  module.exports = { getSensorsStatus, getSensorData }
