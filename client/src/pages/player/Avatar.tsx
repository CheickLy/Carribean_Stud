import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";
import {
  AVATARS,
  updateAvatar,
  type AvatarId,
} from "../../services/users";
import "../../styles/Avatar.css";

export default function Avatar() {
  const navigate = useNavigate();
  const [savedAvatar, setSavedAvatar] = useState<AvatarId>("wave");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>("wave");
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

        const current = AVATARS.some((avatar) => avatar.id === user.avatar)
          ? (user.avatar as AvatarId)
          : "wave";
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

  const preview = AVATARS.find((avatar) => avatar.id === selectedAvatar)!;

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
            <span className="avatar-preview-symbol" aria-hidden="true">
              {preview.symbol}
            </span>
            <div>
              <span className="avatar-preview-label">Preview</span>
              <h2>{preview.label}</h2>
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
