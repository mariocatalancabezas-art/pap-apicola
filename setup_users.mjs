import https from 'https'

const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb3V2Z3dhZmx1ZWdxeWh3aHhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc0NjE3OCwiZXhwIjoyMDk3MzIyMTc4fQ.Hn0hcg7uqYkAhuJDIlD2xTMVgh6YDuObjr6KzdLDcGI'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhb3V2Z3dhZmx1ZWdxeWh3aHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDYxNzgsImV4cCI6MjA5NzMyMjE3OH0.NwTcLbIZY7ujPgaOabXnrPuYebEo7Ief648Xg2mU-Ec'

function request(path, method, body, key) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const options = {
      hostname: 'xaouvgwafluegqyhwhxg.supabase.co',
      path,
      method,
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Prefer': 'return=minimal'
      }
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// Intentar insertar directamente via REST
const payload = {
  email: 'mariocatalancabezas@gmail.com',
  password_hash: '2614aa172181385da2e135781e7dd7c9b30e5adc82241cda77347cb1c3b47543',
  nombre: 'Mario Catalan',
  rol: 'admin',
  activo: true,
  puede_crear: true,
  puede_editar: true,
  puede_eliminar: true,
  puede_exportar: true
}

console.log('Intentando crear tabla via REST upsert...')
const r = await request(
  '/rest/v1/app_users',
  'POST',
  payload,
  serviceKey
)
console.log('Status:', r.status)
console.log('Body:', r.body)

if (r.status === 201 || r.status === 200) {
  console.log('✓ Usuario admin creado correctamente')
} else if (r.body.includes('does not exist') || r.body.includes('PGRST205')) {
  console.log('✗ La tabla app_users no existe en Supabase.')
  console.log('Debes ejecutar el SQL manualmente en supabase.com → SQL Editor')
} else if (r.body.includes('23505') || r.body.includes('duplicate')) {
  console.log('Usuario ya existe, actualizando hash...')
  const r2 = await request(
    '/rest/v1/app_users?email=eq.mariocatalancabezas@gmail.com',
    'PATCH',
    { password_hash: '2614aa172181385da2e135781e7dd7c9b30e5adc82241cda77347cb1c3b47543', activo: true, rol: 'admin' },
    serviceKey
  )
  console.log('Update status:', r2.status, r2.body)
  if (r2.status === 204) console.log('✓ Hash actualizado. Prueba ingresar con admin1234')
}
