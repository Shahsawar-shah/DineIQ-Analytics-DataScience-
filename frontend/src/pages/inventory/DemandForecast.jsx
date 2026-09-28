import PageHeader from '../../components/layout/PageHeader'
import ForecastExplorer from '../../components/forecast/ForecastExplorer'

export default function DemandForecast() {
  return (
    <>
      <PageHeader title="Demand Forecast" subtitle="Expected units per menu item to plan purchasing and preparation" />
      <ForecastExplorer defaultLevel="item" defaultHorizon={14} />
    </>
  )
}
