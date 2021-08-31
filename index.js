import express from 'express'
import axios from 'axios'
import cors from 'cors'
import dotenv from 'dotenv'
import redis from 'redis'

dotenv.config()

const redisClient = redis.createClient(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false,
  },
})
// 'redis://:pefc64c1dd88e9763c770da3144a2dff43020a4d10f3a056069686ef0b99546d4@ec2-3-93-123-2.compute-1.amazonaws.com:15100'

const DEFAULT_EXPIRATION = 3600

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(cors())

function getOrSetCache(key, callback) {
  return new Promise((resolve, reject) => {
    redisClient.get(key, async (error, data) => {
      if (error) {
        return reject(error)
      }
      if (data != null) {
        return resolve(JSON.parse(data))
      } else {
        const freshData = await callback()
        redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(freshData))
        resolve(freshData)
      }
    })
  })
}

app.get('/', (req, res) => {
  res.send('Hello to Redis Practice One API')
})

app.get('/photos', async (req, res) => {
  const albumId = req.query.albumId
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get('https://jsonplaceholder.typicode.com/photos', { params: { albumId } })
    return data
  })
  res.json(photos)
})

app.get('/photos/:id', async (req, res) => {
  const photos = await getOrSetCache(`photos:${req.params.id}`, async () => {
    const { data } = await axios.get(`https://jsonplaceholder.typicode.com/photos/${req.params.id}`)
    return data
  })
  res.json(photos)
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port: ${PORT}`))
