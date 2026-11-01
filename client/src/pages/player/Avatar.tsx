import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import {
  AVATARS,
  updateAvatar,
} from "../../services/users";
import "../../styles/Avatar.css";

export default function Avatar() {
  const navigate = useNavigate();
  const [savedAvatar, setSavedAvatar] = useState("wave");
  const [selectedAvatar, setSelectedAvatar] = useState("wave");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (!user) {
          navigate("/", { replace: true });
          return;
        }

        const current = AVATARS.some((avatar) => avatar.id === user.avatar) || user.avatar?.startsWith("data:image/")
          ? user.avatar : "wave";
        setSavedAvatar(current);
        setSelectedAvatar(current);
      })
      .catch((error) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Could not load profile.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSave() {
    setMessage("");
    setSaving(true);

    try {
      await updateAvatar(selectedAvatar);
      setSavedAvatar(selectedAvatar);
      setMessage("Avatar saved successfully.");
    } catch (error) {
      setSelectedAvatar(savedAvatar);
      setMessage(error instanceof Error ? error.message : "Could not save avatar.");
    } finally {
      setSaving(false);
    }
  }

  const preview = AVATARS.find((avatar) => avatar.id === selectedAvatar);

  async function chooseImage(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 100_000) {
      setMessage("Choose a PNG, JPEG, or WebP image under 100 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setSelectedAvatar(reader.result); setMessage(""); } };
    reader.onerror = () => setMessage("Could not read that image.");
    reader.readAsDataURL(file);
  }

  return (
    <main className="avatar-page">
      <header className="avatar-header">
        <p className="avatar-eyebrow">REEF ROYALE</p>
        <h1>Choose Your Avatar</h1>
        <p>Pick an avatar to use on your profile and at game tables.</p>
      </header>

      {loading ? (
        <p>Loading avatar...</p>
      ) : (
        <>
          <section className="avatar-preview" aria-live="polite">
            <span className="avatar-preview-symbol" aria-hidden="true">{selectedAvatar.startsWith("data:image/") ? <img src={selectedAvatar} alt="" /> : preview?.symbol ?? "🌊"}</span>
            <div>
              <span className="avatar-preview-label">Preview</span>
              <h2>{preview?.label ?? "Your image"}</h2>
            </div>
          </section>

          <fieldset className="avatar-card">
            <legend>Available avatars</legend>
            <div className="avatar-grid">
              {AVATARS.map((avatar) => (
                <label
                  className={
                    selectedAvatar === avatar.id
                      ? "avatar-option avatar-option-selected"
                      : "avatar-option"
                  }
                  key={avatar.id}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={avatar.id}
                    checked={selectedAvatar === avatar.id}
                    onChange={() => {
                      setSelectedAvatar(avatar.id);
                      setMessage("");
                    }}
                  />
                  <span className="avatar-symbol" aria-hidden="true">
                    {avatar.symbol}
                  </span>
                  <span>{avatar.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="avatar-upload">Upload your own image <span>PNG, JPEG, or WebP · under 100 KB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void chooseImage(event.target.files?.[0])} /></label>

          {message && (
            <p className="avatar-message" role="status">
              {message}
            </p>
          )}

          <div className="avatar-actions">
            <button type="button" className="avatar-back" onClick={() => navigate("/play")}>
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedAvatar === savedAvatar}
            >
              {saving ? "Saving..." : "Save Avatar"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
