import { DirectoryList } from "../components/Dashboard/DirectoryList"

export const Settings = () => {
  return (
    <div className="dashboard-sections">
      <div>
        <h2>Configuración</h2>
        <p>Selecciona una opción del menú para ver la configuración.</p>
      </div>
      <DirectoryList />
    </div>
  )
}
