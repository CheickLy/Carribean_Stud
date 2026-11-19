import { useEffect, useState } from 'react';
import { claimClickAdvert, getClickAdvert, type ClickOffer } from '../services/clickAdvert';
import '../styles/SponsoredAdvert.css';

export default function SponsoredAdvertBanner({ onBalanceChange }: { onBalanceChange?: (balance: string) => void }) {
  const [offer, setOffer] = useState<ClickOffer | null>(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  useEffect(() => { let active = true; getClickAdvert().then(value => { if (active) setOffer(value); }).catch(problem => { if (active) setError(problem instanceof Error ? problem.message : ''); }); return () => { active = false; }; }, []);
  if (error || !offer) return null;
  const { advert, claimed } = offer;
  async function visitSponsor() {
    if (claiming) return;
    setClaiming(true); setError('');
    try {
      const result = await claimClickAdvert(advert.advertId);
      onBalanceChange?.(result.balance);
      window.dispatchEvent(new CustomEvent('reef-balance-updated', { detail: result.balance }));
      window.open(result.destinationUrl, '_blank', 'noopener,noreferrer');
      setOffer(current => current ? { ...current, claimed: true } : current);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Could not visit sponsor'); }
    finally { setClaiming(false); }
  }
  return <aside className="sponsored-advert" aria-label="Sponsored advertisement"><div className="sponsored-advert-fallback" aria-hidden="true">♣</div><div className="sponsored-advert-copy"><span className="sponsored-advert-label">Sponsored</span><h2>{advert.title}</h2><p>{advert.creative}</p></div><strong className="sponsored-advert-reward">+{advert.chipReward} CHIPS</strong><div className="sponsored-advert-action">{error && <span className="sponsored-advert-error" role="alert">{error}</span>}<button type="button" onClick={visitSponsor} disabled={claiming}>{claimed ? 'Reward Claimed · Visit Sponsor' : claiming ? 'Opening...' : 'Visit Sponsor'}</button></div></aside>;
}
