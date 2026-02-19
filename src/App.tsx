import { useState, useEffect, useRef } from 'react'

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


// ===== LOGIN COMPONENT =====
function Login({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error de conexión'); setLoading(false); return }
      localStorage.setItem('maint_token', data.token)
      localStorage.setItem('maint_user', JSON.stringify(data.user))
      onLogin(data.user, data.token)
    } catch { setError('Error de conexión al servidor') }
    setLoading(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1769278425/IMG-20260111-WA0001_1_-removebg-preview_zzajxa.png" className="h-16 mx-auto mb-4" alt="Voltride" />
          <h1 className="text-2xl font-bold text-gray-800">Maintenance Voltride</h1>
          <p className="text-gray-500">Connectez-vous pour continuer</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl" placeholder="votre@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border-2 rounded-xl" placeholder="••••••••" required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 text-white font-semibold rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
            {loading ? 'Conexión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  // ===== AUTH STATE =====
  const [user, setUser] = useState<any>(null)
  const [_authToken, setAuthToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    const savedToken = urlToken || localStorage.getItem('maint_token')
    if (savedToken) {
      fetch(API_URL + '/api/auth/me', { headers: { 'Authorization': 'Bearer ' + savedToken } })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(userData => {
          setUser(userData); setAuthToken(savedToken)
          localStorage.setItem('maint_token', savedToken)
          localStorage.setItem('maint_user', JSON.stringify(userData))
        })
        .catch(() => { localStorage.removeItem('maint_token'); localStorage.removeItem('maint_user') })
        .finally(() => setAuthLoading(false))
    } else { setAuthLoading(false) }
    if (urlToken) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const handleLogin = (userData: any, userToken: string) => { setUser(userData); setAuthToken(userToken) }
  const handleLogout = () => {
    localStorage.removeItem('maint_token'); localStorage.removeItem('maint_user')
    setUser(null); setAuthToken(null); window.location.reload()
  }

  // ===== DÉCONNEXION AUTO 3H =====
  useEffect(() => {
    if (!user) return
    let inactivityTimer: any
    const TIMEOUT = 3 * 60 * 60 * 1000
    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => { alert('Sesión expirada por inactividad (3h)'); handleLogout() }, TIMEOUT)
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => { clearTimeout(inactivityTimer); events.forEach(e => window.removeEventListener(e, resetTimer)) }
  }, [user])

  const [page, setPage] = useState<'vehicles' | 'stock' | 'docs'>('vehicles')
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
  const [editPart, setEditPart] = useState<any>(null)
  const [newPart, setNewPart] = useState({ name: '', sku: '', barcode: '', price: '', laborCost: '', vehicleType: 'ALL', category: 'GENERAL', supplierName: '', quantityInStock: '', minimumStock: '1', imageUrl: '' })
  const [selectedPart, setSelectedPart] = useState<any>(null)
  const [movementQty, setMovementQty] = useState('')
  const [movementNote, setMovementNote] = useState('')
  const [movementVehicle, setMovementVehicle] = useState('')
  const [movements, setMovements] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [compatibleIds, setCompatibleIds] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const docFileRef = useRef<HTMLInputElement>(null)
  const [techDocs, setTechDocs] = useState<any[]>([])
  const [docCategory, setDocCategory] = useState('CITY_BIKE')
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [newDoc, setNewDoc] = useState({ title: '', vehicleCategory: 'CITY_BIKE', docType: 'MANUAL', description: '', fileUrl: '' })

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

  const loadDocs = async (cat?: string) => {
    try {
      const url = API_URL + '/api/technical-docs' + (cat ? '?category=' + cat : '')
      const res = await fetch(url)
      if (res.ok) setTechDocs(await res.json())
    } catch (e) { console.error(e) }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ml_default')
      const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/auto/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.secure_url) {
        const ft = file.type.startsWith('image') ? 'image' : file.type.includes('pdf') ? 'pdf' : 'other'
        setNewDoc(prev => ({ ...prev, fileUrl: data.secure_url, fileType: ft }))
      }
    } catch (e) { console.error(e) }
    setUploading(false)
  }

  const addTechDoc = async () => {
    if (!newDoc.title || !newDoc.fileUrl) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/technical-docs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      })
      setNewDoc({ title: '', vehicleCategory: docCategory, docType: 'MANUAL', description: '', fileUrl: '' })
      setShowAddDoc(false); loadDocs(docCategory)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const deleteDoc = async (id: string) => {
    if (!confirm('Eliminar este documento?')) return
    try {
      await fetch(API_URL + '/api/technical-docs/' + id, { method: 'DELETE' })
      loadDocs(docCategory)
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

  useEffect(() => {
    loadVehicles().then(() => {
      // Auto-sélectionner véhicule si QR scan
      const urlParams = new URLSearchParams(window.location.search)
      const vehicleId = urlParams.get('vehicle')
      if (vehicleId) {
        fetch(API_URL + '/api/fleet/' + vehicleId)
          .then(r => r.ok ? r.json() : null)
          .then(v => { if (v) { setSelectedVehicle(v); setNote(v.maintenanceNotes || ''); setTab('info'); loadVehicleDetails(v) } })
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
    loadInventory(); loadDocs()
  }, [])

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

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'ml_default')
      const res = await fetch('https://api.cloudinary.com/v1_1/dis5pcnfr/image/upload', { method: 'POST', body: formData })
      const data = await res.json()
      setUploading(false)
      return data.secure_url || null
    } catch (e) { console.error(e); setUploading(false); return null }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setNewPart(prev => ({ ...prev, imageUrl: url }))
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editPart) return
    const url = await uploadImage(file)
    if (url) {
      await fetch(API_URL + '/api/stock/' + editPart.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url })
      })
      setEditPart({ ...editPart, imageUrl: url })
      loadInventory()
    }
  }

  const resetNewPart = () => setNewPart({ name: '', sku: '', barcode: '', price: '', laborCost: '', vehicleType: 'ALL', category: 'GENERAL', supplierName: '', quantityInStock: '', minimumStock: '1', imageUrl: '' })

  const addInventoryPart = async () => {
    if (!newPart.name || !newPart.price) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/stock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPart, price: parseFloat(newPart.price) || 0, laborCost: parseFloat(newPart.laborCost) || 0, quantityInStock: parseInt(newPart.quantityInStock) || 0, minimumStock: parseInt(newPart.minimumStock) || 1 })
      })
      resetNewPart(); setShowAddPart(false); loadInventory()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const deletePart = async (id: string) => {
    if (!confirm('Eliminar esta pieza?')) return
    try {
      await fetch(API_URL + '/api/stock/' + id, { method: 'DELETE' })
      setEditPart(null); setSelectedPart(null); loadInventory()
    } catch (e) { console.error(e) }
  }

  const saveEditPart = async () => {
    if (!editPart) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/stock/' + editPart.id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPart.name, sku: editPart.sku, barcode: editPart.barcode,
          price: parseFloat(editPart.price) || 0, laborCost: parseFloat(editPart.laborCost) || 0,
          vehicleType: editPart.vehicleType, category: editPart.category,
          supplierName: editPart.supplierName, minimumStock: parseInt(editPart.minimumStock) || 1,
          compatibleFleetIds: compatibleIds
        })
      })
      setEditPart(null); loadInventory()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const toggleCompatible = (id: string) => {
    setCompatibleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const openPartDetail = async (part: any) => {
    setSelectedPart(part); setMovementQty(''); setMovementNote(''); setMovementVehicle('')
    try {
      const res = await fetch(API_URL + '/api/stock/' + part.id + '/movements')
      if (res.ok) setMovements(await res.json())
    } catch (e) { console.error(e) }
  }

  const openEditPart = (part: any) => {
    setEditPart({ ...part, price: String(part.price), laborCost: String(part.laborCost || ''), minimumStock: String(part.minimumStock) })
    setCompatibleIds(part.compatibleFleetIds || [])
    setSelectedPart(null)
  }

  const addMovement = async (type: string) => {
    if (!selectedPart || !movementQty) return
    setSaving(true)
    try {
      await fetch(API_URL + '/api/stock/' + selectedPart.id + '/movement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, quantity: parseInt(movementQty), fleetVehicleId: movementVehicle || null, note: movementNote || null })
      })
      loadInventory()
      const res = await fetch(API_URL + '/api/stock/' + selectedPart.id + '/movements')
      if (res.ok) setMovements(await res.json())
      const partRes = await fetch(API_URL + '/api/stock')
      if (partRes.ok) {
        const allParts = await partRes.json()
        const updated = allParts.find((p: any) => p.id === selectedPart.id)
        if (updated) setSelectedPart(updated)
      }
      setMovementQty(''); setMovementNote(''); setMovementVehicle('')
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const allChecked = checklist.every(c => c.checked)
  const lowStock = inventory.filter(p => p.quantityInStock <= p.minimumStock)

  // Auth guards
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #ffaf10 100%)' }}>
      <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
    </div>
  )
  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-white p-4 shadow-lg" style={{background: 'linear-gradient(135deg, #abdee6, #ffaf10)'}}>
        <div className="flex items-center gap-3 mb-2">
          <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1769278425/IMG-20260111-WA0001_1_-removebg-preview_zzajxa.png" alt="Voltride" className="h-8" />
          <h1 className="text-xl font-bold">Maintenance</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">{user?.firstName}</span>
            <button onClick={handleLogout} className="px-3 py-1 bg-red-500/80 hover:bg-red-600 text-white text-sm rounded transition">Salir</button>
            <a href="https://trivium-launcher-production-a5c8.up.railway.app" className="text-white/70 hover:text-white text-sm">← Launcher</a>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setPage('vehicles')} className={'text-sm font-medium pb-1 border-b-2 ' + (page === 'vehicles' ? 'border-white' : 'border-transparent opacity-70')}>Vehículos</button>
          <button onClick={() => { setPage('stock'); loadInventory() }} className={'text-sm font-medium pb-1 border-b-2 ' + (page === 'stock' ? 'border-white' : 'border-transparent opacity-70')}>
            Stock {lowStock.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStock.length}</span>}
          </button>
          <button onClick={() => { setPage('docs'); loadDocs(docCategory) }} className={'text-sm font-medium pb-1 border-b-2 ' + (page === 'docs' ? 'border-white' : 'border-transparent opacity-70')}>Docs</button>
        </div>
      </div>

      {page === 'vehicles' && (
        <>
          <div className="p-4 flex gap-2">
            <button onClick={() => setFilter('MAINTENANCE')} className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'MAINTENANCE' ? 'bg-[#ffaf10] text-white' : 'bg-white text-gray-700 border')}>
              🔧 Mant. ({vehicles.filter((v: any) => v.status === 'MAINTENANCE').length})
            </button>
            <button onClick={() => setFilter('ALL')} className={'px-4 py-2 rounded-lg font-medium text-sm ' + (filter === 'ALL' ? 'bg-[#ffaf10] text-white' : 'bg-white text-gray-700 border')}>Todos ({vehicles.length})</button>
            <button onClick={loadVehicles} className="ml-auto px-3 py-2 bg-white border rounded-lg text-sm">🔄</button>
          </div>
          <div className="px-4 space-y-3 pb-20">
            {loading ? <div className="text-center py-10 text-gray-500">Cargando...</div>
            : filtered.length === 0 ? <div className="text-center py-10 text-gray-500">{filter === 'MAINTENANCE' ? 'Ningún vehículo en mantenimiento' : 'No hay vehículos'}</div>
            : filtered.map((v: any) => (
              <div key={v.id} onClick={() => openVehicle(v)} className={'bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition ' + (v.status === 'MAINTENANCE' ? 'border-l-4 border-[#ffaf10]' : '')}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {v.vehicle?.imageUrl ? <img src={v.vehicle.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">🚲</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{v.vehicleNumber}</div>
                    <div className="text-sm text-gray-600">{getName(v.vehicle?.name)}</div>
                  </div>
                  <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (v.status === 'MAINTENANCE' ? 'bg-[#ffaf10]/20 text-[#ffaf10]' : v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {v.status === 'MAINTENANCE' ? 'Mant.' : v.status === 'AVAILABLE' ? 'Disp.' : 'Alquilado'}
                  </div>
                </div>
                {v.maintenanceNotes && <div className="mt-2 p-2 bg-[#ffaf10]/10 rounded text-sm text-[#ffaf10]">{v.maintenanceNotes}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {page === 'stock' && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input value={stockSearch} onChange={e => setStockSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadInventory()} placeholder="Buscar pieza, ref, código..." className="flex-1 border rounded-lg p-2 text-sm" />
            <button onClick={loadInventory} className="px-3 py-2 bg-[#ffaf10] text-white rounded-lg text-sm">Buscar</button>
            <button onClick={() => { resetNewPart(); setShowAddPart(true) }} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">+</button>
          </div>
          {lowStock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="font-medium text-red-700 text-sm mb-1">Stock bajo</div>
              {lowStock.map((p: any) => <div key={p.id} className="text-xs text-red-600">{p.name}: {p.quantityInStock} (min: {p.minimumStock})</div>)}
            </div>
          )}
          <div className="space-y-2 pb-20">
            {inventory.map((p: any) => (
              <div key={p.id} onClick={() => openPartDetail(p)} className={'bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md ' + (p.quantityInStock <= p.minimumStock ? 'border-l-4 border-red-400' : '')}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="text-lg">🔩</span>}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.sku || ''} {p.barcode ? '| ' + p.barcode : ''}</div>
                    <div className="text-xs text-gray-400">{p.supplierName || 'Sin proveedor'} | {p.vehicleType || 'ALL'}</div>
                  </div>
                  <div className="text-right">
                    <div className={'font-bold text-lg ' + (p.quantityInStock <= p.minimumStock ? 'text-red-600' : 'text-green-600')}>{p.quantityInStock}</div>
                    <div className="text-xs text-gray-500">{Number(p.price).toFixed(2)}€</div>
                  </div>
                </div>
              </div>
            ))}
            {inventory.length === 0 && <div className="text-center py-10 text-gray-400">Sin piezas en stock</div>}
          </div>
        </div>
      )}

      {page === 'docs' && (
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            {['CITY_BIKE', 'E_BIKE', 'E_MOTOCROSS'].map(cat => (
              <button key={cat} onClick={() => { setDocCategory(cat); loadDocs(cat) }}
                className={'px-3 py-2 rounded-lg text-sm font-medium ' + (docCategory === cat ? 'bg-[#ffaf10] text-white' : 'bg-white text-gray-700 border')}>
                {cat === 'CITY_BIKE' ? 'City Bike' : cat === 'E_BIKE' ? 'E-Bike' : 'E-Motocross'}
              </button>
            ))}
            <button onClick={() => { setNewDoc({ title: '', vehicleCategory: docCategory, docType: 'MANUAL', description: '', fileUrl: '' }); setShowAddDoc(true) }}
              className="ml-auto px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">+</button>
          </div>
          <div className="space-y-3 pb-20">
            {techDocs.filter(d => d.vehicleCategory === docCategory).length === 0 ? (
              <div className="text-center py-10 text-gray-400">Sin documentos para esta categoría</div>
            ) : techDocs.filter(d => d.vehicleCategory === docCategory).map((doc: any) => (
              <div key={doc.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                    {doc.fileType === 'pdf' ? '📄' : doc.fileType === 'image' ? '🖼' : '📎'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{doc.title}</div>
                    <div className="text-xs text-gray-500">{doc.docType === 'MANUAL' ? 'Manual' : doc.docType === 'EXPLODED_VIEW' ? 'Vista eclatada' : doc.docType === 'WIRING' ? 'Esquema eléctrico' : doc.docType === 'SPECS' ? 'Especificaciones' : 'Otro'}</div>
                    {doc.description && <div className="text-xs text-gray-400 mt-1">{doc.description}</div>}
                  </div>
                  <div className="flex gap-1">
                    <a href={doc.fileUrl} target="_blank" rel="noopener" className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">Ver</a>
                    <button onClick={() => deleteDoc(doc.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">X</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add doc modal */}
      {showAddDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddDoc(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Nuevo documento</h2>
            <div className="space-y-3">
              <input value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} placeholder="Título *" className="w-full border rounded-lg p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newDoc.vehicleCategory} onChange={e => setNewDoc({...newDoc, vehicleCategory: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="CITY_BIKE">City Bike</option><option value="E_BIKE">E-Bike</option><option value="E_MOTOCROSS">E-Motocross</option>
                </select>
                <select value={newDoc.docType} onChange={e => setNewDoc({...newDoc, docType: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="MANUAL">Manual</option><option value="EXPLODED_VIEW">Vista eclatada</option><option value="WIRING">Esquema eléctrico</option><option value="SPECS">Especificaciones</option><option value="OTHER">Otro</option>
                </select>
              </div>
              <textarea value={newDoc.description} onChange={e => setNewDoc({...newDoc, description: e.target.value})} placeholder="Descripción..." rows={2} className="w-full border rounded-lg p-2 text-sm" />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer" onClick={() => docFileRef.current?.click()}>
                {newDoc.fileUrl ? (
                  <div className="text-green-600 text-sm font-medium">Archivo subido ✓</div>
                ) : uploading ? (
                  <div className="text-orange-500 text-sm">Subiendo...</div>
                ) : (
                  <div className="text-gray-400 text-sm">Toca para subir archivo (PDF, imagen...)</div>
                )}
                <input ref={docFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleDocUpload} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddDoc(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg">Cancelar</button>
              <button onClick={addTechDoc} disabled={saving || !newDoc.title || !newDoc.fileUrl} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle detail modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div><h2 className="text-xl font-bold">{selectedVehicle.vehicleNumber}</h2><p className="text-gray-500 text-sm">{getName(selectedVehicle.vehicle?.name)}</p></div>
                <button onClick={() => setSelectedVehicle(null)} className="text-2xl text-gray-400">&times;</button>
              </div>
              <div className="flex gap-1 mb-4 border-b overflow-x-auto">
                {(['info','parts','history','checklist'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} className={'px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ' + (tab === t ? 'border-[#ffaf10] text-[#ffaf10]' : 'border-transparent text-gray-500')}>
                    {t === 'info' ? 'Info' : t === 'parts' ? 'Piezas' : t === 'history' ? 'Historial' : 'Check-list'}
                  </button>
                ))}
              </div>
              {tab === 'info' && (
                <div>
                  <div className={'text-center py-2 rounded-lg mb-4 font-medium ' + (selectedVehicle.status === 'MAINTENANCE' ? 'bg-[#ffaf10]/20 text-[#ffaf10]' : 'bg-green-100 text-green-700')}>
                    {selectedVehicle.status === 'MAINTENANCE' ? 'En mantenimiento' : 'Disponible'}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full border rounded-lg p-2 text-sm" />
                    <button onClick={() => saveNote(selectedVehicle.id)} disabled={saving} className="mt-2 w-full py-2 bg-[#ffaf10] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {selectedVehicle.status === 'MAINTENANCE' && <button onClick={() => updateStatus(selectedVehicle.id, 'AVAILABLE')} disabled={saving} className="w-full py-3 bg-green-500 text-white rounded-lg font-bold disabled:opacity-50">Marcar disponible</button>}
                    {selectedVehicle.status === 'AVAILABLE' && <button onClick={() => updateStatus(selectedVehicle.id, 'MAINTENANCE')} disabled={saving} className="w-full py-3 bg-[#ffaf10] text-white rounded-lg font-bold disabled:opacity-50">Pasar a mantenimiento</button>}
                  </div>
                </div>
              )}
              {tab === 'parts' && (
                <div>
                  {spareParts.length === 0 ? <div className="text-center py-6 text-gray-400 text-sm">Sin piezas asignadas</div>
                  : spareParts.map((p: any) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-3 mb-2 flex justify-between">
                      <div><div className="font-medium text-sm">{p.name}</div><div className="text-xs text-gray-500">{p.partNumber || ''}</div></div>
                      <div className="text-right"><div className="font-bold text-sm">{Number(p.totalCost || 0).toFixed(2)}€</div><div className="text-xs text-gray-500">Stock: {p.quantityInStock}</div></div>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'history' && (
                <div>
                  <div className="bg-[#abdee6]/20 rounded-lg p-3 mb-4">
                    <input value={newMaintDesc} onChange={e => setNewMaintDesc(e.target.value)} placeholder="Trabajo realizado..." className="w-full border rounded-lg p-2 text-sm mb-2" />
                    <div className="flex gap-2">
                      <input value={newMaintCost} onChange={e => setNewMaintCost(e.target.value)} placeholder="Coste" type="number" className="flex-1 border rounded-lg p-2 text-sm" />
                      <button onClick={addMaintenance} disabled={saving || !newMaintDesc} className="px-4 py-2 bg-[#ffaf10] text-white rounded-lg text-sm disabled:opacity-50">Agregar</button>
                    </div>
                  </div>
                  {maintenance.length === 0 ? <div className="text-center py-6 text-gray-400 text-sm">Sin historial</div>
                  : maintenance.map((m: any) => (
                    <div key={m.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                      <div className="flex justify-between"><div className="font-medium text-sm">{m.description}</div><div className="text-xs text-gray-500">{formatDate(m.completedDate || m.scheduledDate)}</div></div>
                      {m.cost > 0 && <div className="text-xs text-[#ffaf10] mt-1">Coste: {Number(m.cost).toFixed(2)}€</div>}
                    </div>
                  ))}
                </div>
              )}
              {tab === 'checklist' && (
                <div>
                  <div className="space-y-2">
                    {checklist.map(c => (
                      <label key={c.id} onClick={() => toggleCheck(c.id)} className={'flex items-center gap-3 p-3 rounded-lg cursor-pointer ' + (c.checked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200')}>
                        <div className={'w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ' + (c.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300')}>
                          {c.checked && '\u2713'}
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
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300" onClick={() => fileRef.current?.click()}>
                  {newPart.imageUrl ? <img src={newPart.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center text-xs text-gray-400">{uploading ? 'Subiendo...' : 'Foto'}</div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                <div className="flex-1"><input value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} placeholder="Nombre *" className="w-full border rounded-lg p-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.sku} onChange={e => setNewPart({...newPart, sku: e.target.value})} placeholder="SKU / Ref" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.barcode} onChange={e => setNewPart({...newPart, barcode: e.target.value})} placeholder="Código barras" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} placeholder="Precio *" type="number" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.laborCost} onChange={e => setNewPart({...newPart, laborCost: e.target.value})} placeholder="Mano obra" type="number" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newPart.vehicleType} onChange={e => setNewPart({...newPart, vehicleType: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="ALL">Todos</option><option value="CB">CB</option><option value="EB">EB</option><option value="EM">EM</option>
                </select>
                <select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="GENERAL">General</option><option value="WHEEL">Rueda</option><option value="BRAKE">Freno</option><option value="CHAIN">Cadena</option><option value="LIGHT">Luz</option><option value="BATTERY">Batería</option><option value="SEAT">Asiento</option><option value="HANDLEBAR">Manillar</option><option value="ACCESSORY">Accesorio</option><option value="CONSUMABLE">Consumible</option>
                </select>
              </div>
              <input value={newPart.supplierName} onChange={e => setNewPart({...newPart, supplierName: e.target.value})} placeholder="Proveedor" className="w-full border rounded-lg p-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPart.quantityInStock} onChange={e => setNewPart({...newPart, quantityInStock: e.target.value})} placeholder="Cantidad" type="number" className="border rounded-lg p-2 text-sm" />
                <input value={newPart.minimumStock} onChange={e => setNewPart({...newPart, minimumStock: e.target.value})} placeholder="Stock mínimo" type="number" className="border rounded-lg p-2 text-sm" />
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
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {selectedPart.imageUrl ? <img src={selectedPart.imageUrl} className="w-full h-full object-cover" /> : <span className="text-lg">🔩</span>}
                  </div>
                  <div><h2 className="text-lg font-bold">{selectedPart.name}</h2><p className="text-gray-500 text-xs">{selectedPart.sku || ''} {selectedPart.barcode ? '| ' + selectedPart.barcode : ''}</p></div>
                </div>
                <button onClick={() => setSelectedPart(null)} className="text-2xl text-gray-400">&times;</button>
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={() => openEditPart(selectedPart)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">Editar</button>
                <button onClick={() => deletePart(selectedPart.id)} className="flex-1 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium">Eliminar</button>
              </div>
              {selectedPart.compatibleFleetIds && selectedPart.compatibleFleetIds.length > 0 && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <div className="text-xs font-medium text-blue-700 mb-1">Vehículos compatibles:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPart.compatibleFleetIds.map((fid: string) => {
                      const v = vehicles.find(x => x.id === fid)
                      return v ? <span key={fid} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{v.vehicleNumber}</span> : null
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Stock</div><div className={'text-xl font-bold ' + (selectedPart.quantityInStock <= selectedPart.minimumStock ? 'text-red-600' : 'text-green-600')}>{selectedPart.quantityInStock}</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Precio</div><div className="text-xl font-bold">{Number(selectedPart.price).toFixed(2)}€</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Min.</div><div className="text-xl font-bold">{selectedPart.minimumStock}</div></div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-sm font-medium mb-2">Movimiento de stock</div>
                <input value={movementQty} onChange={e => setMovementQty(e.target.value)} placeholder="Cantidad" type="number" className="w-full border rounded-lg p-2 text-sm mb-2" />
                <select value={movementVehicle} onChange={e => setMovementVehicle(e.target.value)} className="w-full border rounded-lg p-2 text-sm mb-2">
                  <option value="">Sin vehículo</option>
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
                    <span className={'font-medium ' + (m.type === 'IN' || m.type === 'RETURN' ? 'text-green-700' : 'text-red-700')}>{m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}</span>
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

      {/* Edit part modal */}
      {editPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditPart(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Editar pieza</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 relative">
                  {editPart.imageUrl ? <img src={editPart.imageUrl} className="w-full h-full object-cover" /> : <div className="text-xs text-gray-400">{uploading ? 'Subiendo...' : 'Foto'}</div>}
                  <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleEditImageUpload} />
                </div>
                <div className="flex-1"><input value={editPart.name} onChange={e => setEditPart({...editPart, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={editPart.sku || ''} onChange={e => setEditPart({...editPart, sku: e.target.value})} placeholder="SKU" className="border rounded-lg p-2 text-sm" />
                <input value={editPart.barcode || ''} onChange={e => setEditPart({...editPart, barcode: e.target.value})} placeholder="Código barras" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={editPart.price} onChange={e => setEditPart({...editPart, price: e.target.value})} placeholder="Precio" type="number" className="border rounded-lg p-2 text-sm" />
                <input value={editPart.laborCost} onChange={e => setEditPart({...editPart, laborCost: e.target.value})} placeholder="Mano obra" type="number" className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={editPart.vehicleType || 'ALL'} onChange={e => setEditPart({...editPart, vehicleType: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="ALL">Todos</option><option value="CB">CB</option><option value="EB">EB</option><option value="EM">EM</option>
                </select>
                <select value={editPart.category || 'GENERAL'} onChange={e => setEditPart({...editPart, category: e.target.value})} className="border rounded-lg p-2 text-sm">
                  <option value="GENERAL">General</option><option value="WHEEL">Rueda</option><option value="BRAKE">Freno</option><option value="CHAIN">Cadena</option><option value="LIGHT">Luz</option><option value="BATTERY">Batería</option><option value="SEAT">Asiento</option><option value="HANDLEBAR">Manillar</option><option value="ACCESSORY">Accesorio</option><option value="CONSUMABLE">Consumible</option>
                </select>
              </div>
              <input value={editPart.supplierName || ''} onChange={e => setEditPart({...editPart, supplierName: e.target.value})} placeholder="Proveedor" className="w-full border rounded-lg p-2 text-sm" />
              <input value={editPart.minimumStock} onChange={e => setEditPart({...editPart, minimumStock: e.target.value})} placeholder="Stock mínimo" type="number" className="w-full border rounded-lg p-2 text-sm" />

              <div>
                <div className="text-sm font-medium mb-2">Vehículos compatibles</div>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {vehicles.map((v: any) => (
                    <label key={v.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded" onClick={() => toggleCompatible(v.id)}>
                      <div className={'w-5 h-5 rounded border flex items-center justify-center text-xs ' + (compatibleIds.includes(v.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300')}>
                        {compatibleIds.includes(v.id) && '\u2713'}
                      </div>
                      <span className="text-sm">{v.vehicleNumber} - {getName(v.vehicle?.name)}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">{compatibleIds.length} seleccionado(s)</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditPart(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg">Cancelar</button>
              <button onClick={saveEditPart} disabled={saving} className="flex-1 py-2 bg-[#ffaf10] text-white rounded-lg font-medium disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
