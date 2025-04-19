const { InfluxDB } = require('@influxdata/influxdb-client')

const url = process.env.INFLUX_URL
const token = process.env.INFLUX_TOKEN
const org = process.env.INFLUX_ORG
const bucket = process.env.INFLUX_BUCKET

const client = new InfluxDB({ url, token })
const queryApi = client.getQueryApi(org)

async function getSensorsStatus(device_id, thresholdMinutes = 5) {
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
    console.log('Dernière date de', field, ':', lastTime, 'vs cutoff:', cutoff)

    if (lastTime && new Date(lastTime) > new Date(cutoff)) {
      active.push(field)
    } else {
      inactive.push(field)
    }
  }

  return { active, inactive }
}

module.exports = { getSensorsStatus }
