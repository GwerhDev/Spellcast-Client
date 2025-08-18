import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeadphonesSimple } from "@fortawesome/free-solid-svg-icons";

export const Loader = () => {
  return (
    <div className="loader d-flex pl-3 pr-3">
      <FontAwesomeIcon size="2xl" icon={faHeadphonesSimple} />
    </div>
  )
}
