import { useState, useEffect } from 'react'

const API_URL = 'https://api-voltrideandmotorrent-production.up.railway.app'

function getName(name: any): string {
  if (!name) return ''
  if (typeof name === 'string') return name
  return name.es || name.fr || name.en || ''
}
function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-ES')
}

export default function App() {
  const [page, setPage] = useState<'vehicles' | 'stock'>('vehicles')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'MAINTENANCE' | 'ALL'>('MAINTENANCE')
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'parts' | 'history' | 'checklist'>('info')
  const [spareParts, setSpareParts] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [newMaintDesc, setNewMaintDesc] = useState('')
  const [newMaintCost, setNewMaintCost] = useState('')
  const [stockSearch, setStockSearch] = useState('')
  const [showAddPart, setShowAddPart] = useState(false)
  const [newPart, setNewPart] = useState({ name: '', sku: '', barcode: '', price: '', laborCost: '', vehicleType: 'ALL', category: 'GENERAL', supplierName: '', quantityInStock: '', minimumStock: '1' })
  const [selectedPart, setSelectedPart] = useState<any>(null)
  const [movementQty, setMovementQty] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [movementVehicle, setMovementVehicle] = useState('')
  const [movements, setMovements] = useState<any[]>([])

  const defaultChecklist = [
    { id: 'brakes', label: 'Frenos', checked: false },
    { id: 'tires', label: 'Ruedas / Neum\u00e1ticos', checked: false },
    { id: 'chain', label: 'Cadena / Correa', checked: false },
    { id: 'lights', label: 'Luces', checked: false },
    { id: 'battery', label: 'Bater\u00eda (e-bikes)', checked: false },
    { id: 'bell', label: 'Timbre', checked: false },
    { id: 'seat', label: 'Sill\u00edn', checked: false },
    { id: 'handlebars', label: 'Manillar', checked: false },
    { id: 'pedals', label: 'Pedales', checked: false },
    { id: 'basket', label: 'Cesta / Portaequipajes', checked: false },
    { id: 'lock', label: 'Candado', checked: false },
    { id: 'clean', label: 'Limpieza general', checked: false },
  ]

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL + '/api/fleet')
      const data = await res.json()
      setVehicles(data.filter((v: any) => v.vehicle?.category?.brand === 'VOLTRIDE'))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadInventory = async () => {
    try {
      const url = stockSearch ? API_URL + '/api/stock?search=' + encodeURIComponent(stockSearch) : API_URL + '/api/stock'
      const res = await fetch(url)
      if (res.ok) setInventory(await res.json())
    } catch (e) { console.error(e) }
  }

  const loadVehicleDetails = async (v: any) => {
    try {
      const [partsRes, maintRes] = await Promise.all([
        fetch(API_URL + '/api/fleet/' + v.id + '/spare-parts'),
        fetch(API_URL + '/api/fleet/' + v.id + '/maintenance')
      ])
      if (partsRes.ok) setSpareParts(await partsRes.json())
      if (maintRes.ok) setMaintenance(await maintRes.json())
    } catch (e) { console.error(e) }
    setChecklist(defaultChecklist.map(c => ({ ...c })))
  }

  useEffect(() => { loadVehicles(); loadInventory() }, [])

  const openVehicle = (v: any) => {
    setSelectedVehicle(v); setNote(v.maintenanceNotes || ''); setTab('info'); loadVehicleDetails(v)
  }

  const filtered = filter === 'ALL' ? vehicles : vehicles.filter((v: any) => v.status === 'MAINTENANCE')

  const updateStatus = async (id: string, status: string) => {
    setSaving(true)
    try {
      await fetch(API_URL + '/api/fleet/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, maintenanceNotes: note || null })
      })
      await loadVehicles(); setSelectedVehicle(null); setNote('')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const saveNote = async (id: string) => {
    setSaving(true)
    try {
      await fetch(API_URL + '/api/fleet/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceNotes: note })
      })
      await loadVehicles()
      if (selectedVehicle) setSelectedVehicle({ ...selectedVehicle, maintenanceNotes: note })
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const addMaintenance = async () => {
    if (!selectedVehicle || !newMaintDesc) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/fleet/' + selectedVehicle.id + '/maintenance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CORRECTIVE', description: newMaintDesc, cost: parseFloat(newMaintCost) || 0, status: 'COMPLETED', scheduledDate: new Date().toISOString(), completedDate: new Date().toISOString() })
      })
      setNewMaintDesc(''); setNewMaintCost('')
      const res = await fetch(API_URL + '/api/fleet/' + selectedVehicle.id + '/maintenance')
      if (res.ok) setMaintenance(await res.json())
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggleCheck = (id: string) => setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c))

  const addInventoryPart = async () => {
    if (!newPart.name || !newPart.price) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/stock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPart, price: parseFloat(newPart.price) || 0, laborCost: parseFloat(newPart.laborCost) || 0, quantityInStock: parseInt(newPart.quantityInStock) || 0, minimumStock: parseInt(newPart.minimumStock) || 1 })
      })
      setNewPart({ name: '', sku: '', barcode: '', price: '', laborCost: '', vehicleType: 'ALL', category: 'GENERAL', supplierName: '', quantityInStock: '', minimumStock: '1' })
      setShowAddPart(false); loadInventory()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const openPartDetail = async (part: any) => {
    setSelectedPart(part); setMovementQty(''); setMovementNote(''); setMovementVehicle('')
    try {
      const res = await fetch(API_URL + '/api/stock/' + part.id + '/movements')
      if (res.ok) setMovements(await res.json())
    } catch (e) { console.error(e) }
  }

  const addMovement = async (type: string) => {
    if (!selectedPart || !movementQty) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/stock/' + selectedPart.id + '/movement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, quantity: parseInt(movementQty), fleetVehicleId: movementVehicle || null, note: movementNote || null })
      })
      loadInventory(); openPartDetail(selectedPart)
      setMovementQty(''); setMovementNote(''); setMovementVehicle('')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const allChecked = checklist.every(c => c.checked)
  const lowStock = inventory.filter(p => p.quantityInStock <= p.minimumStock)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">&#x1F527; Voltride Maintenance</h1>
        <div className="flex gap-4 mt-2">
          <button onClick={() => setPage('vehicles')} className={'text-sm font-medium pb-1 border-b-2 ' + (page === 'vehicles' ? 'border-white' : 'border-transparent opacity-70')}>
            Veh&#237;culos
          </button>
          <button onClick={() => { setPage('stock'); loadInventory() }} className={'text-sm font-medium pb-1 border-b-2 ' + (page === 'stock' ? 'border-white' : 'border-transparent opacity-70')}>
            Stock {lowStock.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStock.length}</span>}
          </button>
        </div>
      </div>

      {page === 'vehicles' && (
        <>
          <div className="p-4 flex gap-2">
            <button onClick={() => setFilter('MAINTENANCE')}
              className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'MAINTENANCE' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border')}>
              &#x1F527; Mant. ({vehicles.filter((v: any) => v.status === 'MAINTENANCE').length})
            </button>
            <button onClick={() => setFilter('ALL')}
              className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'ALL' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border')}>
              Todos ({vehicles.length})
            </button>
            <button onClick={loadVehicles} className="ml-auto px-3 py-2 bg-white border rounded-lg text-sm">&#x1F504;</button>
          </div>
          <div className="px-4 space-y-3 pb-20">
            {loading ? <div className="text-center py-10 text-gray-500">Cargando...</div>
            : filtered.length === 0 ? <div className="text-center py-10 text-gray-500">{filter === 'MAINTENANCE' ? 'Ning&#250;n veh&#237;culo en mantenimiento' : 'No hay veh&#237;culos'}</div>
            : filtered.map((v: any) => (
              <div key={v.id} onClick={() => openVehicle(v)}
                className={'bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition ' + (v.status === 'MAINTENANCE' ? 'border-l-4 border-orange-500' : '')}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {v.vehicle?.imageUrl ? <img src={v.vehicle.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">&#x1F6B2;</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{v.vehicleNumber}</div>
                    <div className="text-sm text-gray-600">{getName(v.vehicle?.name)}</div>
                  </div>
                  <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (v.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700' : v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {v.status === 'MAINTENANCE' ? 'Mant.' : v.status === 'AVAILABLE' ? 'Disp.' : 'Alquilado'}
                  </div>
                </div>
                {v.maintenanceNotes && <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-800">{v.maintenanceNotes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {page === 'stock' && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input value={stockSearch} onChange={e => setStockSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadInventory()}
              placeholder="Buscar pieza, ref, c&#243;digo..." className="flex-1 border rounded-lg p-2 text-sm" />
            <button onClick={loadInventory} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm">Buscar</button>
            <button onClick={() => setShowAddPart(true)} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">+</button>
          </div>

          {lowStock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="font-medium text-red-700 text-sm mb-1">Stock bajo</div>
              {lowStock.map((p: any) => (
                <div key={p.id} className="text-xs text-red-600">{p.name}: {p.quantityInStock} (min: {p.minimumStock})</div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {inventory.map((p: any) => (
              <div key={p.id} onClick={() => openPartDetail(p)}
                className={'bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md ' + (p.quantityInStock <= p.minimumStock ? 'border-l-4 border-red-400' : '')}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="text-lg">&#x1F529;</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.sku || ''} {p.barcode ? '| ' + p.barcode : ''}</div>
                    <div className="text-xs text-gray-400">{p.supplierName || 'Sin proveedor'} | {p.vehicleType || 'ALL'}</div>
                  </div>
                  <div className="text-right">
                    <div className={'font-bold text-lg ' + (p.quantityInStock <= p.minimumStock ? 'text-red-600' : 'text-green-600')}>{p.quantityInStock}</div>
                    <div className="text-xs text-gray-500">{Number(p.price).toFixed(2)}&#8364;</div>
                  </div>
                </div>
              </div>
            ))}
            {inventory.length === 0 && <div className="text-center py-10 text-gray-400">Sin piezas en stock</div>}
          </div>
        </div>
      )}

      {/* Vehicle detail modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold">{selectedVehicle.vehicleNumber}</h2>
                  <p className="text-gray-500 text-sm">{getName(selectedVehicle.vehicle?.name)}</p>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="text-2xl text-gray-400">&times;</button>
              </div>
              <div className="flex gap-1 mb-4 border-b overflow-x-auto">
                {(['info','parts','history','checklist'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={'px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ' + (tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500')}>
                    {t === 'info' ? 'Info' : t === 'parts' ? 'Piezas' : t === 'history' ? 'Historial' : 'Check-list'}
                  </button>
                ))}
              </div>

              {tab === 'info' && (
                <div>
                  <div className={'text-center py-2 rounded-lg mb-4 font-medium ' + (selectedVehicle.status === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>
                    {selectedVehicle.status === 'MAINTENANCE' ? 'En mantenimiento' : 'Disponible'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs">Km</div><div className="font-bold">{selectedVehicle.currentMileage || 0}</div></div>
                    <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs">Pr&#243;x. mant.</div><div className="font-bold">{formatDate(selectedVehicle.nextMaintenanceDate)}</div></div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full border rounded-lg p-2 text-sm" />
                    <button onClick={() => saveNote(selectedVehicle.id)} disabled={saving} className="mt-2 w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedVehicle.status === 'MAINTENANCE' && (
                      <button onClick={() => updateStatus(selectedVehicle.id, 'AVAILABLE')} disabled={saving} className="w-full py-3 bg-green-500 text-white rounded-lg font-bold disabled:opacity-50">Marcar disponible</button>
                    )}
                    {selectedVehicle.status === 'AVAILABLE' && (
                      <button onClick={() => updateStatus(selectedVehicle.id, 'MAINTENANCE')} disabled={saving} className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold disabled:opacity-50">Pasar a mantenimiento</button>
                    )}
                  </div>
                </div>
              )}

              {tab === 'parts' && (
                <div>
                  {spareParts.length === 0 ? <div className="text-center py-6 text-gray-400 text-sm">Sin piezas asignadas</div>
                  : spareParts.map((p: any) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-3 mb-2 flex justify-between">
                      <div><div className="font-medium text-sm">{p.name}</div><div className="text-xs text-gray-500">{p.partNumber || ''}</div></div>
                      <div className="text-right"><div className="font-bold text-sm">{Number(p.totalCost || 0).toFixed(2)}&#8364;</div><div className="text-xs text-gray-500">Stock: {p.quantityInStock}</div></div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'history' && (
                <div>
                  <div className="bg-orange-50 rounded-lg p-3 mb-4">
                    <input value={newMaintDesc} onChange={e => setNewMaintDesc(e.target.value)} placeholder="Trabajo realizado..." className="w-full border rounded-lg p-2 text-sm mb-2" />
                    <div className="flex gap-2">
                      <input value={newMaintCost} onChange={e => setNewMaintCost(e.target.value)} placeholder="Coste" type="number" className="flex-1 border rounded-lg p-2 text-sm" />
                      <button onClick={addMaintenance} disabled={saving || !newMaintDesc} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50">Agregar</button>
                    </div>
                  </div>
                  {maintenance.length === 0 ? <div className="text-center py-6 text-gray-400 text-sm">Sin historial</div>
                  : maintenance.map((m: any) => (
                    <div key={m.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                      <div className="flex justify-between"><div className="font-medium text-sm">{m.description}</div><div className="text-xs text-gray-500">{formatDate(m.completedDate || m.scheduledDate)}</div></div>
                      {m.cost > 0 && <div className="text-xs text-orange-600 mt-1">Coste: {Number(m.cost).toFixed(2)}&#8364;</div>}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'checklist' && (
                <div>
                  <div className="space-y-2">
                    {checklist.map(c => (
                      <label key={c.id} onClick={() => toggleCheck(c.id)}
                        className={'flex items-center gap-3 p-3 rounded-lg cursor-pointer ' + (c.checked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200')}>
                        <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ' + (c.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300')}>
                          {c.checked && '&#10003;'}
                        </div>
                        <span className={'text-sm ' + (c.checked ? 'text-green-700 line-through' : '')}>{c.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className={'mt-4 text-center py-3 rounded-lg font-medium ' + (allChecked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {allChecked ? 'Listo para alquilar' : checklist.filter(c => c.checked).length + '/' + checklist.length + ' verificados'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add part modal */}
      {showAddPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddPart(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Nueva pieza</h2>
            <div className="space-y-3">
              <input value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} placeholder="Nombre *" className="w-full border rounded-lg p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.sku} onChange={e => setNewPart({...newPart, sku: e.target.value})} placeholder="SKU / Ref" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.barcode} onChange={e => setNewPart({...newPart, barcode: e.target.value})} placeholder="C&#243;digo barras" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} placeholder="Precio *" type="number" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.laborCost} onChange={e => setNewPart({...newPart, laborCost: e.target.value})} placeholder="Mano obra" type="number" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newPart.vehicleType} onChange={e => setNewPart({...newPart, vehicleType: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="ALL">Todos</option><option value="CB">CB - Bicicletas</option><option value="EB">EB - E-bikes</option><option value="EM">EM - E-motos</option>
                </select>
                <select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="GENERAL">General</option><option value="WHEEL">Rueda</option><option value="BRAKE">Freno</option><option value="CHAIN">Cadena</option><option value="LIGHT">Luz</option><option value="BATTERY">Bater&#237;a</option><option value="SEAT">Asiento</option><option value="HANDLEBAR">Manillar</option><option value="ACCESSORY">Accesorio</option><option value="CONSUMABLE">Consumible</option>
                </select>
              </div>
              <input value={newPart.supplierName} onChange={e => setNewPart({...newPart, supplierName: e.target.value})} placeholder="Proveedor" className="w-full border rounded-lg p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.quantityInStock} onChange={e => setNewPart({...newPart, quantityInStock: e.target.value})} placeholder="Cantidad" type="number" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.minimumStock} onChange={e => setNewPart({...newPart, minimumStock: e.target.value})} placeholder="Stock m&#237;nimo" type="number" className="border rounded-lg p-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddPart(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg">Cancelar</button>
              <button onClick={addInventoryPart} disabled={saving || !newPart.name || !newPart.price} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Part detail modal */}
      {selectedPart && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedPart(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedPart.name}</h2>
                  <p className="text-gray-500 text-sm">{selectedPart.sku} {selectedPart.barcode ? '| ' + selectedPart.barcode : ''}</p>
                </div>
                <button onClick={() => setSelectedPart(null)} className="text-2xl text-gray-400">&times;</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Stock</div><div className={'text-xl font-bold ' + (selectedPart.quantityInStock <= selectedPart.minimumStock ? 'text-red-600' : 'text-green-600')}>{selectedPart.quantityInStock}</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Precio</div><div className="text-xl font-bold">{Number(selectedPart.price).toFixed(2)}&#8364;</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Min.</div><div className="text-xl font-bold">{selectedPart.minimumStock}</div></div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium mb-2">Movimiento de stock</div>
                <input value={movementQty} onChange={e => setMovementQty(e.target.value)} placeholder="Cantidad" type="number" className="w-full border rounded-lg p-2 text-sm mb-2" />
                <select value={movementVehicle} onChange={e => setMovementVehicle(e.target.value)} className="w-full border rounded-lg p-2 text-sm mb-2">
                  <option value="">Sin veh&#237;culo asignado</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.vehicleNumber} - {getName(v.vehicle?.name)}</option>)}
                </select>
                <input value={movementNote} onChange={e => setMovementNote(e.target.value)} placeholder="Nota..." className="w-full border rounded-lg p-2 text-sm mb-2" />
                <div className="flex gap-2">
                  <button onClick={() => addMovement('IN')} disabled={saving || !movementQty} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">+ Entrada</button>
                  <button onClick={() => addMovement('OUT')} disabled={saving || !movementQty} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">- Salida</button>
                </div>
              </div>

              <div className="text-sm font-medium mb-2">Historial</div>
              {movements.length === 0 ? <div className="text-center py-4 text-gray-400 text-sm">Sin movimientos</div>
              : movements.map((m: any) => (
                <div key={m.id} className={'rounded-lg p-2 mb-1 text-sm flex justify-between ' + (m.type === 'IN' || m.type === 'RETURN' ? 'bg-green-50' : 'bg-red-50')}>
                  <div>
                    <span className={'font-medium ' + (m.type === 'IN' || m.type === 'RETURN' ? 'text-green-700' : 'text-red-700')}>
                      {m.type === 'IN' ? '+' : '-'}{m.quantity}
                    </span>
                    {m.note && <span className="text-gray-500 ml-2">{m.note}</span>}
                    {m.fleetVehicle && <span className="text-gray-400 ml-1">({m.fleetVehicle.vehicleNumber})</span>}
                  </div>
                  <div className="text-xs text-gray-400">{formatDate(m.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
