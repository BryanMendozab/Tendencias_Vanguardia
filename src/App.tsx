import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Filter, LayoutDashboard, Lightbulb, Search, Target, TrendingUp, Upload } from 'lucide-react'
import './App.css'

type Period = { start: string; end: string }
type Sale = { date: string; storeId: string; skuId: string; customerId: string; quantity: number; unitPrice: number; totalValue: number; channel: string; discount: number; category: string; skuName: string; subcategory: string; costPrice: number; brand: string; storeName: string; city: string; storeType: string; customerSegment: string; promoName: string }
type Dimension = { [key: string]: string }

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const colors = ['coral', 'mustard', 'sage']

function csvLine(line: string) {
  const result: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { result.push(current); current = '' }
    else current += char
  }
  result.push(current)
  return result
}

function parseCsv(text: string): Dimension[] {
  const lines = text.trim().split(/\r?\n/)
  const headers = csvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = csvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

function inRange(date: string, range: Period) { return date >= range.start && date <= range.end }
function percentChange(current: number, previous: number) { return previous ? ((current - previous) / previous) * 100 : 0 }
function formatPercent(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` }
function unique<T>(values: T[]) { return new Set(values.filter(Boolean)).size }

function TrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${values.length === 1 ? 0 : (index * 671) / (values.length - 1)},${116 - (value / max) * 94}`).join(' ')
  return <div className="chart-wrap"><svg viewBox="0 0 671 136" className="trend-chart" role="img" aria-label="Evolución de ventas por mes"><defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e4a24d" stopOpacity=".25" /><stop offset="100%" stopColor="#e4a24d" stopOpacity="0" /></linearGradient></defs>{[20, 52, 84, 116].map((y) => <line key={y} x1="0" x2="671" y1={y} y2={y} className="grid-line" />)}<polygon points={`0,116 ${points} 671,116`} fill="url(#area-fill)" /><polyline points={points} fill="none" stroke="#d88932" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{values.map((value, index) => <circle key={index} cx={values.length === 1 ? 0 : (index * 671) / (values.length - 1)} cy={116 - (value / max) * 94} r="4" className="chart-dot" />)}</svg><div className="chart-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div></div>
}

function App() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeNav, setActiveNav] = useState('Resumen')
  const [category, setCategory] = useState('Todas')
  const [store, setStore] = useState('Todas')
  const [channel, setChannel] = useState('Todos')
  const [segment, setSegment] = useState('Todos')
  const [product, setProduct] = useState('Todos')
  const [promotion, setPromotion] = useState('Todas')
  const [discountOnly, setDiscountOnly] = useState(false)
  const [_lowStockCount, setLowStockCount] = useState(0)
  const [periodA, setPeriodA] = useState<Period>({ start: '2024-01-01', end: '2024-06-30' })
  const [periodB, setPeriodB] = useState<Period>({ start: '2024-07-01', end: '2024-12-31' })

  useEffect(() => {
    Promise.all(['bm_sales.csv', 'bm_skus.csv', 'bm_stores.csv', 'bm_customers.csv', 'bm_promotions.csv', 'bm_inventory.csv'].map((file) => fetch(`/data/synthetic/${file}`).then((response) => response.text())))
      .then(([salesText, skusText, storesText, customersText, promotionsText, inventoryText]) => {
        const skus = new Map(parseCsv(skusText).map((row) => [row.sku_id, row]))
        const stores = new Map(parseCsv(storesText).map((row) => [row.store_id, row]))
        const customers = new Map(parseCsv(customersText).map((row) => [row.cust_id, row]))
        const promotions = parseCsv(promotionsText)
        setLowStockCount(parseCsv(inventoryText).filter((row) => Number(row.stock_on_hand) <= Number(row.reorder_point)).length)
        const parsed = parseCsv(salesText).map((row): Sale => {
          const sku = skus.get(row.sku_id) ?? {}
          const storeData = stores.get(row.store_id) ?? {}
          const customer = customers.get(row.customer_id) ?? {}
          const promo = promotions.find((item) => row.date >= item.start_date && row.date <= item.end_date && Number(item.discount_pct) === Number(row.discount_pct))
          return { date: row.date, storeId: row.store_id, skuId: row.sku_id, customerId: row.customer_id, quantity: Number(row.quantity) || 0, unitPrice: Number(row.unit_price) || 0, totalValue: Number(row.total_value) || 0, channel: row.channel, discount: Number(row.discount_pct) || 0, category: sku.category || 'Sin categoría', skuName: sku.sku_name || `SKU ${row.sku_id}`, subcategory: sku.subcategory || 'Sin subcategoría', costPrice: Number(sku.cost_price) || 0, brand: sku.brand || 'Sin marca', storeName: storeData.store_name || `Tienda ${row.store_id}`, city: storeData.city || 'Sin ciudad', storeType: storeData.store_type || 'Sin tipo', customerSegment: customer.loyalty_segment || 'Sin segmento', promoName: promo?.promo_name || 'Sin promoción' }
        })
        setSales(parsed)
        const dates = parsed.map((row) => row.date).sort()
        if (dates.length) { setPeriodA({ start: dates[0], end: `${dates[0].slice(0, 4)}-06-30` }); setPeriodB({ start: `${dates[0].slice(0, 4)}-07-01`, end: `${dates[0].slice(0, 4)}-12-31` }) }
      }).catch((loadError: Error) => setError(loadError.message)).finally(() => setLoading(false))
  }, [])

  const options = useMemo(() => ({
    categories: [...new Set(sales.map((row) => row.category))].sort(),
    products: [...new Set(sales.map((row) => row.skuName))].sort(),
    promotions: [...new Set(sales.map((row) => row.promoName))].sort(),
    stores: [...new Set(sales.map((row) => row.storeName))].sort(),
    channels: [...new Set(sales.map((row) => row.channel))].sort(),
    segments: [...new Set(sales.map((row) => row.customerSegment))].sort(),
  }), [sales])
  const filtered = useMemo(() => sales.filter((row) => (category === 'Todas' || row.category === category) && (product === 'Todos' || row.skuName === product) && (promotion === 'Todas' || row.promoName === promotion) && (store === 'Todas' || row.storeName === store) && (channel === 'Todos' || row.channel === channel) && (segment === 'Todos' || row.customerSegment === segment) && (!discountOnly || row.discount > 0)), [sales, category, product, promotion, store, channel, segment, discountOnly])
  const rowsA = useMemo(() => filtered.filter((row) => inRange(row.date, periodA)), [filtered, periodA])
  const rowsB = useMemo(() => filtered.filter((row) => inRange(row.date, periodB)), [filtered, periodB])
  const stats = (rows: Sale[]) => { const revenue = rows.reduce((sum, row) => sum + row.totalValue, 0); const cost = rows.reduce((sum, row) => sum + row.costPrice * row.quantity, 0); return { revenue, profit: revenue - cost, units: rows.reduce((sum, row) => sum + row.quantity, 0), transactions: rows.length, customers: unique(rows.map((row) => row.customerId)), margin: revenue ? ((revenue - cost) / revenue) * 100 : 0, averageDiscount: rows.length ? rows.reduce((sum, row) => sum + row.discount, 0) / rows.length : 0 } }
  const metricA = stats(rowsA); const metricB = stats(rowsB)
  const monthly = useMemo(() => monthLabels.map((label, month) => ({ label, value: rowsB.filter((row) => new Date(`${row.date}T00:00:00`).getMonth() === month).reduce((sum, row) => sum + row.totalValue, 0) })), [rowsB])
  const categoryRanking = useMemo(() => { const map = new Map<string, { revenue: number; profit: number; units: number }>(); rowsB.forEach((row) => { const item = map.get(row.category) ?? { revenue: 0, profit: 0, units: 0 }; item.revenue += row.totalValue; item.profit += row.totalValue - row.costPrice * row.quantity; item.units += row.quantity; map.set(row.category, item) }); return [...map.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 5) }, [rowsB])
  const productRanking = useMemo(() => { const map = new Map<string, { revenue: number; profit: number; units: number }>(); rowsB.forEach((row) => { const item = map.get(row.skuName) ?? { revenue: 0, profit: 0, units: 0 }; item.revenue += row.totalValue; item.profit += row.totalValue - row.costPrice * row.quantity; item.units += row.quantity; map.set(row.skuName, item) }); return [...map.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 5) }, [rowsB])
  const storeRanking = useMemo(() => { const map = new Map<string, number>(); rowsB.forEach((row) => map.set(row.storeName, (map.get(row.storeName) ?? 0) + row.totalValue)); return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) }, [rowsB])
  const maxMonth = monthly.reduce((best, item) => item.value > best.value ? item : best, { label: '-', value: 0 })
  const growth = percentChange(metricB.revenue, metricA.revenue)

  if (loading) return <div className="data-state">Cargando 641 mil transacciones y sus dimensiones...</div>
  if (error) return <div className="data-state error">No se pudo cargar el dataset: {error}</div>

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><Activity size={17} /></span><span>nexo<span className="brand-dot">.</span></span></div><div className="workspace"><span className="workspace-avatar">BR</span><div><strong>BlueMart Retail</strong><small>Dataset analítico</small></div></div><nav className="main-nav"><span className="nav-label">ANÁLISIS</span>{[['Resumen', LayoutDashboard], ['Tendencias', TrendingUp], ['Comparativas', BarChart3], ['Anomalías', AlertTriangle]].map(([label, Icon]) => <button className={`nav-item ${activeNav === label ? 'active' : ''}`} key={label as string} onClick={() => setActiveNav(label as string)}><Icon size={17} />{label as string}</button>)}<span className="nav-label second">DIMENSIONES</span><button className="nav-item"><Target size={17} />Inventario</button><button className="nav-item"><Upload size={17} />Promociones</button></nav><div className="user-card"><span className="user-avatar">AG</span><div><strong>Ana García</strong><small>Analista</small></div></div></aside><main className="content"><header className="topbar"><div className="breadcrumbs"><span>BlueMart Retail</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Buscar"><Search size={18} /></button><button className="avatar-button">AG</button></div></header><div className="page-inner"><section className="page-heading"><div><div className="eyebrow"><TrendingUp size={14} /> ANÁLISIS DE NEGOCIO</div><h1>Comportamiento del negocio</h1><p>Compara periodos y encuentra productos, tiendas y categorías rentables.</p></div><span className="dataset-badge">{sales.length.toLocaleString('en-US')} registros de venta</span></section><section className="filter-bar"><div className="filter-intro"><Filter size={16} /><span>Filtros</span></div><label><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Todas</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Producto</span><select value={product} onChange={(event) => setProduct(event.target.value)}><option>Todos</option>{options.products.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Tienda</span><select value={store} onChange={(event) => setStore(event.target.value)}><option>Todas</option>{options.stores.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Canal</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Todos</option>{options.channels.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Segmento</span><select value={segment} onChange={(event) => setSegment(event.target.value)}><option>Todos</option>{options.segments.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Promoción</span><select value={promotion} onChange={(event) => setPromotion(event.target.value)}><option>Todas</option>{options.promotions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="toggle-filter"><input type="checkbox" checked={discountOnly} onChange={(event) => setDiscountOnly(event.target.checked)} /> Solo descuentos</label></section><section className="compare-bar"><div><strong>Periodo A</strong><span>Base de comparación</span><input type="date" value={periodA.start} onChange={(event) => setPeriodA({ ...periodA, start: event.target.value })} /><input type="date" value={periodA.end} onChange={(event) => setPeriodA({ ...periodA, end: event.target.value })} /></div><div className="compare-vs">VS</div><div><strong>Periodo B</strong><span>Periodo actual</span><input type="date" value={periodB.start} onChange={(event) => setPeriodB({ ...periodB, start: event.target.value })} /><input type="date" value={periodB.end} onChange={(event) => setPeriodB({ ...periodB, end: event.target.value })} /></div><small>Fuente: bm_sales + dimensiones relacionadas</small></section><section className="stats-grid"><article className="stat-card featured"><div className="stat-top"><span>Ingresos · Periodo B</span><span className="stat-icon orange"><TrendingUp size={17} /></span></div><strong>{money.format(metricB.revenue)}</strong><div className={`stat-change ${growth >= 0 ? 'positive' : 'negative'}`}>{growth >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{formatPercent(growth)}<span>vs. Periodo A</span></div><div className="stat-caption">Periodo A <b>{money.format(metricA.revenue)}</b></div></article><article className="stat-card"><div className="stat-top"><span>Ganancia estimada</span><span className="stat-icon teal"><BarChart3 size={17} /></span></div><strong>{money.format(metricB.profit)}</strong><div className="stat-change positive"><ArrowUpRight size={15} />Margen {metricB.margin.toFixed(1)}%</div><div className="stat-caption">Cambio <b>{formatPercent(percentChange(metricB.profit, metricA.profit))}</b></div></article><article className="stat-card"><div className="stat-top"><span>Unidades vendidas</span><span className="stat-icon lilac"><Target size={17} /></span></div><strong>{metricB.units.toLocaleString('en-US')}</strong><div className="stat-change positive"><ArrowUpRight size={15} />{formatPercent(percentChange(metricB.units, metricA.units))}</div><div className="stat-caption">Registros de venta <b>{metricB.transactions.toLocaleString('en-US')}</b></div></article><article className="stat-card"><div className="stat-top"><span>Ticket promedio</span><span className="stat-icon blue"><Activity size={17} /></span></div><strong>{money.format(metricB.transactions ? metricB.revenue / metricB.transactions : 0)}</strong><div className="stat-change positive"><ArrowUpRight size={15} />Clientes {metricB.customers.toLocaleString('en-US')}</div><div className="stat-caption">Descuento medio <b>{metricB.averageDiscount.toFixed(1)}%</b></div></article></section><section className="main-grid"><article className="panel trend-panel"><div className="panel-header"><div><h2>Ingresos por mes</h2><p>Periodo B · responde a filtros y fechas</p></div><span className="chart-peak">Pico: {maxMonth.label}</span></div><div className="chart-meta"><strong>{money.format(metricB.revenue)}</strong><span className="positive">{formatPercent(growth)}</span></div><TrendChart values={monthly.map((item) => item.value)} labels={monthLabels} /></article><article className="panel category-panel"><div className="panel-header"><div><h2>Rentabilidad por categoría</h2><p>Ordenado por ganancia</p></div></div><div className="category-list">{categoryRanking.map(([name, value], index) => <div className="category-row" key={name}><span className={`category-color ${colors[index % colors.length]}`} /><div><strong>{name}</strong><small>{money.format(value.profit)} ganancia · {value.units.toLocaleString('en-US')} uds.</small></div><b>{value.revenue ? `${((value.profit / value.revenue) * 100).toFixed(1)}%` : '0%'}</b></div>)}</div></article></section><section className="bottom-grid"><article className="panel anomaly-panel"><div className="panel-header"><div><h2>Productos rentables y señales</h2><p>Información para decidir, no solo visualizar</p></div></div><div className="anomaly-list">{productRanking.slice(0, 3).map(([name, value], index) => <div className="anomaly-row" key={name}><span className={`signal-icon ${index === 0 ? 'info' : 'neutral'}`}><TrendingUp size={16} /></span><div><strong>{name}</strong><small>{value.units.toLocaleString('en-US')} unidades · {money.format(value.revenue)} ingresos · {money.format(value.profit)} ganancia</small></div><span className="severity low">{value.revenue ? `${((value.profit / value.revenue) * 100).toFixed(0)}% margen` : 'N/D'}</span></div>)}</div></article><article className="insight-card"><div className="insight-icon"><Lightbulb size={19} /></div><div><span className="eyebrow">DECISIÓN SUGERIDA</span><h2>{productRanking[0]?.[0] ?? 'Sin resultados'}</h2><p>{productRanking[0] ? `Es el producto con mayor ganancia en el Periodo B. Compáralo con unidades vendidas para distinguir volumen de rentabilidad.` : 'Ajusta los filtros o fechas para obtener resultados.'}</p><div className="insight-link">Tienda líder: {storeRanking[0]?.[0] ?? 'N/D'}</div></div></article></section></div></main></div>
}

export default App
