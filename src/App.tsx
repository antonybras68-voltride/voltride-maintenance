import { useState, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

interface FleetVehicle {
  id: string
  vehicleNumber: string
  status: string
  maintenanceNotes: string | null
  notes: string | null
  vehicle: { name: any; imageUrl: string | null; category?: { name: any } }
  agency: { name: any }
  damages: any[]
}

function getName(name: any): string {
  if (!name) return ''
  if (typeof name === 'string') return name
  return name.es || name.fr || name.en || ''
}

export default function App() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'MAINTENANCE' | 'ALL'>('MAINTENANCE')
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL + '/api/fleet')
      const data = await res.json()
      setVehicles(data.filter((v: any) => {
        const brand = v.vehicle?.category?.brand
        return brand === 'VOLTRIDE'
      }))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadVehicles() }, [])

  const filtered = filter === 'ALL' ? vehicles : vehicles.filter(v => v.status === 'MAINTENANCE')

  const updateStatus = async (id: string, status: string, maintenanceNotes?: string) => {
    setSaving(true)
    try {
      await fetch(API_URL + '/api/fleet/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, maintenanceNotes: maintenanceNotes || null })
      })
      await loadVehicles()
      setSelectedVehicle(null)
      setNote('')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const saveNote = async (id: string) => {
    setSaving(true)
    try {
      await fetch(API_URL + '/api/fleet/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceNotes: note })
      })
      await loadVehicles()
      if (selectedVehicle) {
        setSelectedVehicle({ ...selectedVehicle, maintenanceNotes: note })
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">&#x1F527; Voltride Maintenance</h1>
        <p className="text-orange-100 text-sm">Gesti&#243;n de mantenimiento de veh&#237;culos</p>
      </div>

      <div className="p-4 flex gap-2">
        <button onClick={() => setFilter('MAINTENANCE')}
          className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'MAINTENANCE' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border')}>
          &#x1F527; En mantenimiento ({vehicles.filter(v => v.status === 'MAINTENANCE').length})
        </button>
        <button onClick={() => setFilter('ALL')}
          className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'ALL' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border')}>
          Todos ({vehicles.length})
        </button>
        <button onClick={loadVehicles} className="ml-auto px-3 py-2 bg-white border rounded-lg text-sm">&#x1F504;</button>
      </div>

      <div className="px-4 space-y-3 pb-20">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {filter === 'MAINTENANCE' ? 'Ning&#250;n veh&#237;culo en mantenimiento' : 'No hay veh&#237;culos'}
          </div>
        ) : filtered.map(v => (
          <div key={v.id} onClick={() => { setSelectedVehicle(v); setNote(v.maintenanceNotes || '') }}
            className={'bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition ' + (v.status === 'MAINTENANCE' ? 'border-l-4 border-orange-500' : '')}>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {v.vehicle?.imageUrl ? <img src={v.vehicle.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">&#x1F6B2;</span>}
              </div>
              <div className="flex-1">
                <div className="font-bold">{v.vehicleNumber}</div>
                <div className="text-sm text-gray-600">{getName(v.vehicle?.name)}</div>
                <div className="text-xs text-gray-400">{getName(v.agency?.name)}</div>
              </div>
              <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                v.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700' :
                v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                v.status === 'RENTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              )}>
                {v.status === 'MAINTENANCE' ? '&#x1F527; Mant.' : v.status === 'AVAILABLE' ? 'Disp.' : v.status === 'RENTED' ? 'Alquilado' : v.status}
              </div>
            </div>
            {v.maintenanceNotes && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-800">{v.maintenanceNotes}</div>
            )}
            {v.damages && v.damages.length > 0 && (
              <div className="mt-1 text-xs text-red-500">{v.damages.length} problema(s) activo(s)</div>
            )}
          </div>
        ))}
      </div>

      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedVehicle.vehicleNumber}</h2>
                  <p className="text-gray-500 text-sm">{getName(selectedVehicle.vehicle?.name)}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="text-2xl text-gray-400">&times;</button>
              </div>

              <div className={'text-center py-2 rounded-lg mb-4 font-medium ' + (
                selectedVehicle.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              )}>
                {selectedVehicle.status === 'MAINTENANCE' ? '&#x1F527; En mantenimiento' : 'Disponible'}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de mantenimiento</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  rows={4} placeholder="Descripci&#243;n del trabajo a realizar..."
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
                <button onClick={() => saveNote(selectedVehicle.id)} disabled={saving}
                  className="mt-2 w-full py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>

              {selectedVehicle.damages && selectedVehicle.damages.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-sm mb-2">Problemas activos</h3>
                  {selectedVehicle.damages.map((d: any) => (
                    <div key={d.id} className="bg-red-50 rounded-lg p-3 mb-2 text-sm">
                      <div className="font-medium text-red-700">{d.description || d.type}</div>
                      {d.notes && <div className="text-red-600 mt-1">{d.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {selectedVehicle.status === 'MAINTENANCE' && (
                  <button onClick={() => updateStatus(selectedVehicle.id, 'AVAILABLE', note)}
                    disabled={saving}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 disabled:opacity-50">
                    Marcar como disponible
                  </button>
                )}
                {selectedVehicle.status === 'AVAILABLE' && (
                  <button onClick={() => updateStatus(selectedVehicle.id, 'MAINTENANCE', note)}
                    disabled={saving}
                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50">
                    Pasar a mantenimiento
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
