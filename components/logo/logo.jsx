import React, { useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../renderer/useIsomorphicLayoutEffect';
let gsapCached = null;
let morphSVGPluginCached = null;

const Logo = ({ isOpen, showSubNav }) => {
  const logoRef = useRef(null);
  const [gsapReady, setGsapReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (!gsapCached && typeof window !== 'undefined') {
      Promise.all([
        import('gsap').then((module) => (gsapCached = module.gsap)),
        import('gsap/MorphSVGPlugin').then(
          (module) => (morphSVGPluginCached = module.MorphSVGPlugin)
        ),
      ]).then(() => {
        gsapCached.registerPlugin(morphSVGPluginCached);
        setGsapReady(true);
      });
    } else if (gsapCached) {
      setGsapReady(true);
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (gsapReady) {
      if (showSubNav) {
        gsapCached.to(logoRef.current, {
          morphSVG: '#back-button-path',
          duration: 0.25,
        });
      } else if (isOpen) {
        gsapCached.to(logoRef.current, {
          morphSVG: '#home-button-path',
          duration: 0.25,
        });
      } else {
        gsapCached.to(logoRef.current, { morphSVG: '#logo-path', duration: 0.25 });
      }
    }
  }, [gsapReady, isOpen, showSubNav]);

  return (
    <svg width="64px" height="64px" viewBox="0 0 64 64" version="1.1">
      <g
        id="logo"
        stroke="white"
        strokeWidth={showSubNav || isOpen ? '8' : '0'}
        strokeLinecap="butt"
        strokeLinejoin="bevel"
      >
        <path
          id="logo-path"
          ref={logoRef}
          fill={showSubNav || isOpen ? 'none' : 'rgba(255, 255, 255, 1.0)'}
          d="M59.75,0.44921875 C74.1712781,3.84416792 87.1832967,10.863918 87.1832967,28.9955797 C87.1832967,47.1272414 71.8580613,61.8258574 52.9534255,61.8258574 L0.451171875,61.8258574 L11.8085937,49.8875746 L52.9534255,49.8875746 C64.9836483,49.8875746 74.7360708,40.5339099 74.7360708,28.9955797 C74.7360708,17.4572495 62.3974103,11.4804688 50.3671875,11.4804688 L59.75,0.44921875 Z"
        />
        <path
          id="home-button-path"
          style={{ display: 'none' }}
          fill="none"
          d="M17.7762223,0 C22.0993405,1.05095417 26,3.22401634 26,8.83692672 C26,14.4498371 21.4058992,19 15.7387888,19 L0,19 L3.40465506,15.304337 L15.7387888,15.304337 C19.3451318,15.304337 22.2686505,12.4087788 22.2686505,8.83692672 C22.2686505,5.26507465 18.569846,3.41487829 14.963503,3.41487829 L17.7762223,0 Z"
        />
        <path
          id="back-button-path"
          style={{ display: 'none' }}
          fill="none"
          d="M17.7762223,0 C22.0993405,1.05095417 26,3.22401634 26,8.83692672 C26,14.4498371 21.4058992,19 15.7387888,19 L0,19 L3.40465506,15.304337 L15.7387888,15.304337 C19.3451318,15.304337 22.2686505,12.4087788 22.2686505,8.83692672 C22.2686505,5.26507465 18.569846,3.41487829 14.963503,3.41487829 L17.7762223,0 Z"
        />
      </g>
    </svg>
  );
};

export default Logo;