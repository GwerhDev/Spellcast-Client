import streambyLogo from "../../../assets/streamby-logo.svg";

export const Loader = () => {
  return (
    <div className="loader d-flex pl-3 pr-3">
      <img src={streambyLogo} className="logo d-flex" width={"50%"} alt="" />
    </div>
  )
}
