import PageHeader from '../../components/layout/PageHeader'
import ForecastExplorer from '../../components/forecast/ForecastExplorer'

export default function Forecasting() {
  return (
    <>
      <PageHeader title="Demand Forecasting" subtitle="Historical vs predicted demand by item, category and location: Linear Regression and ARIMA against a naive baseline" />
      <ForecastExplorer defaultLevel="overall" defaultHorizon={30} />
    </>
  )
}
