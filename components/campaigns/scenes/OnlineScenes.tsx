/**
 * #156 (plan §20.13: "how me humare sare options ka acha visuals live dikhe"): the online formats, drawn as the
 * screens they live on, with the campaign's own creative in them and a little life:
 *  - social feed: a phone's feed with the post scrolling into view, likes popping;
 *  - short video: a vertical video playing (a slow push-in), its progress running, hearts rising;
 *  - search ads: the name typed into a search, the sponsored result on top with its picture and Watch now;
 *  - creators: a creator's live stream with the creative on it, the viewer count and the chat going;
 *  - connected TV: a smart TV's home screen with the creative as the sponsored hero and the rows below.
 * #158: and the two doors only an opening has (the launch builder's How):
 *  - app stores: the service's store page on a phone, the creative as its featured banner, Pre-register turning to
 *    Registered, stars rising;
 *  - carrier bundles: a carrier's plan card with the service included, the creative beside it, its signal running.
 * Drawn at a fixed design size (320 × 200) and scaled to the card, so every line sits the same at any width. No faces,
 * no real brands. The motion is CSS only and holds still while `paused`.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import css from './OnlineScenes.module.css';
import type { CampaignFormatId } from '../../../types';
import { creativeUrl } from './sceneArt';

type Creative = HTMLCanvasElement | HTMLImageElement;
export type OnlineFormatId = Extract<CampaignFormatId, 'SOCIAL_FEED' | 'SHORT_VIDEO' | 'SEARCH' | 'CREATORS' | 'CTV'>;
export const ONLINE_SCENES: OnlineFormatId[] = ['SOCIAL_FEED', 'SHORT_VIDEO', 'SEARCH', 'CREATORS', 'CTV'];
/** #158: the launch's doors, drawn the same way */
export type LaunchDoorSceneId = 'DEVICE_STORES' | 'TELCO_BUNDLES';

const DESIGN_W = 320;
const DESIGN_H = 200;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

export const OnlineScene: React.FC<{
  formatId: OnlineFormatId | LaunchDoorSceneId;
  creative: Creative | null;
  /** the campaign's subject (a title, or the service) and the service's own name */
  subjectName: string;
  brandName: string;
  /** the service's hue */
  hue: number;
  paused?: boolean;
}> = ({ formatId, creative, subjectName, brandName, hue, paused = false }) => {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [art, setArt] = useState<string | null>(null);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    const measure = () => setScale(Math.max(element.clientWidth / DESIGN_W, element.clientHeight / DESIGN_H));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let alive = true;
    if (!creative) { setArt(null); return undefined; }
    creativeUrl(creative, 600).then(url => { if (alive) setArt(url); }).catch(() => undefined);
    return () => { alive = false; };
  }, [creative]);
  const picture = art ? { backgroundImage: `url(${art})` } : undefined;
  const initial = (brandName || 'N').trim().charAt(0).toUpperCase();
  const handle = (brandName || 'service').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return (
    <div className={cx(css.online, paused && css.held)} ref={box} style={{ ['--hue' as string]: hue }}>
      <div className={css.design} style={{ width: DESIGN_W, height: DESIGN_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {formatId === 'SOCIAL_FEED' && (
          <div className={css.feedScene}>
            <i className={css.bokeh} />
            <div className={css.phone}>
              <div className={css.feed}>
                <div className={css.postHead}><b>{initial}</b><span><em>{brandName}</em><small>Sponsored</small></span></div>
                <div className={css.postArt} style={picture} />
                <div className={css.postActions}><i className={css.heart}>♥</i><span>12.4K</span><span>💬 318</span><span>↗</span></div>
                <div className={css.postLine}><b>{handle}</b> Now streaming: {subjectName}</div>
                <div className={css.ghost}><i /><i /><i /></div>
              </div>
            </div>
            <div className={css.reactions} aria-hidden="true"><i>♥</i><i>🔥</i><i>♥</i><i>👏</i></div>
          </div>
        )}
        {formatId === 'SHORT_VIDEO' && (
          <div className={css.shortScene}>
            <i className={css.bokeh} />
            <div className={cx(css.phone, css.tall)}>
              <div className={css.video} style={picture} />
              <div className={css.sideIcons}><i>♥</i><small>98K</small><i>💬</i><small>2.1K</small><i>↗</i></div>
              <div className={css.caption}><b>@{handle}</b><span>{subjectName} · now streaming</span></div>
              <div className={css.progress}><i /></div>
              <div className={css.hearts} aria-hidden="true"><i>♥</i><i>♥</i><i>♥</i></div>
            </div>
          </div>
        )}
        {formatId === 'SEARCH' && (
          <div className={css.searchScene}>
            <div className={css.browser}>
              <div className={css.searchBar}><i className={css.lens} /><span className={css.typed} style={{ ['--chars' as string]: Math.min(28, subjectName.length) }}>{subjectName.slice(0, 28)}</span><i className={css.caret} /></div>
              <div className={css.result}>
                <div className={css.resultArt} style={picture} />
                <div className={css.resultText}>
                  <small><b>Sponsored</b> · {handle}.tv</small>
                  <b>{subjectName}</b>
                  <span>Watch it now on {brandName}. Start your membership today.</span>
                  <em>Watch now</em>
                </div>
              </div>
              <div className={css.organic}><i /><i /><i /></div>
            </div>
          </div>
        )}
        {formatId === 'CREATORS' && (
          <div className={css.creatorScene}>
            <div className={css.stream} style={picture} />
            <div className={css.streamTop}><b className={css.live}>LIVE</b><span>24.1K watching</span></div>
            <div className={css.host}><i /><span>Reacting to {subjectName}</span></div>
            <div className={css.chat} aria-hidden="true">
              <p><b>mo_reviews</b> need this 🔥</p>
              <p><b>cinephile22</b> watching tonight</p>
              <p><b>ana.k</b> best show this year</p>
              <p><b>jay</b> on {brandName}?? 😮</p>
            </div>
          </div>
        )}
        {formatId === 'CTV' && (
          <div className={css.ctvScene}>
            <i className={css.wallGlow} />
            <div className={css.tv}>
              <div className={css.tvScreen}>
                <div className={css.hero} style={picture}><small>Sponsored</small></div>
                <div className={css.rail}><i /><i /><i /><i /></div>
              </div>
            </div>
            <i className={css.stand} />
          </div>
        )}
        {formatId === 'DEVICE_STORES' && (
          <div className={css.storeScene}>
            <i className={css.bokeh} />
            <div className={css.phone}>
              <div className={css.store}>
                <div className={css.storeBanner} style={picture}><small>Featured</small></div>
                <div className={css.storeApp}>
                  <b>{initial}</b>
                  <span><em>{brandName}</em><small>Entertainment · Free</small><i>★★★★★ <small>4.8</small></i></span>
                </div>
                <div className={css.storeGet}><span>Pre-register</span><span>✓ Registered</span></div>
                <div className={css.storeCount}>1.2M pre-registered · opens soon</div>
                <div className={css.ghost}><i /><i /></div>
              </div>
            </div>
            <div className={css.reactions} aria-hidden="true"><i>★</i><i>⇩</i><i>★</i><i>✓</i></div>
          </div>
        )}
        {formatId === 'TELCO_BUNDLES' && (
          <div className={css.carrierScene}>
            <div className={css.planCard}>
              <div className={css.planHead}>
                <span><small>Your carrier</small><b>Unlimited Plus</b></span>
                <i className={css.signal} aria-hidden="true"><i /><i /><i /><i /></i>
              </div>
              <div className={css.bundle}>
                <div className={css.bundleArt} style={picture}><em>Included</em></div>
                <span><b>{brandName} included</b><small>{subjectName === brandName ? 'Every plan, at no extra cost' : `${subjectName} and more, at no extra cost`}</small></span>
              </div>
              <div className={css.planFoot}>
                <span><b>$45</b><small>/mo · 5G</small></span>
                <em>Switch now</em>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
