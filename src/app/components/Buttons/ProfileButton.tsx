import s from "./ProfileButton.module.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faHome, faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import { userData } from "../../../interfaces";
import { ProfileCanvas } from "../Canvas/ProfileCanvas";

export const ProfileButton = (props: { userData: userData }) => {
  const { userData } = props || {};
  const { profilePic, username } = userData || {};
  const [showCanvas, setShowCanvas] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleProfileButton = () => {
    setShowCanvas((prev) => !prev);
  };

  const handleLogoutModal = () => {
    const logoutModal = document.getElementById("logout-modal") as HTMLDivElement | null;
    if (logoutModal) logoutModal.style.display = "flex";
  };

  const handleGoHome = () => {
    setShowCanvas(false);
    navigate("/");
  };

  const handleAccount = () => {
    setShowCanvas(false);
    navigate("/user");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCanvas(false);
      }
    };

    if (showCanvas) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCanvas]);

  return (
    <div className={s.container} ref={containerRef}>
      <span className={s.canvas}>
        {showCanvas && <ProfileCanvas userData={userData} />}
        <div className={s.profileButtonContainer}>
          {showCanvas && (
            <ul className={s.accountActionsContainer}>
              <button title="Home" onClick={handleGoHome}>
                <FontAwesomeIcon icon={faHome} />
              </button>
              <button title="Account" onClick={handleAccount}>
                <FontAwesomeIcon icon={faUser} />
              </button>
              <button title="Settings">
                <FontAwesomeIcon icon={faGear} />
              </button>
              <button title="Logout" onClick={handleLogoutModal}>
                <FontAwesomeIcon icon={faRightFromBracket} />
              </button>
            </ul>
          )}
          <span className={s.profileButton} onClick={handleProfileButton}>
            {
              profilePic
                ? <img src={profilePic} alt="Profile picture" width="100%" />
                : <span>{username}</span>
            }
          </span>
        </div>
      </span>
    </div>
  );
};
