import { useEffect, useRef, useState } from 'react';

import { env } from '@/config/env';

import styles from './HomeLocationSection.module.scss';

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoMap {
  relayout: () => void;
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  setPosition: (position: KakaoLatLng) => void;
}

interface KakaoGeocoderResult {
  x: string;
  y: string;
}

interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void,
  ) => void;
}

interface KakaoMapsApi {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Map: new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
    },
  ) => KakaoMap;
  Marker: new (options: { position: KakaoLatLng }) => KakaoMarker;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Status: {
      OK: string;
    };
  };
}

interface KakaoWindow extends Window {
  kakao?: {
    maps: KakaoMapsApi;
  };
}

const KAKAO_MAP_SCRIPT_ID = 'sonoschool-kakao-map-sdk';
const SONOSCHOOL_ADDRESS = '경기도 화성시 동탄구 동탄지성로 17';
const SONOSCHOOL_ADDRESS_DETAIL = 'B1층 101호 (반송동, 동탄 위버폴리스)';
const SONOSCHOOL_MAP_SEARCH_ADDRESS = `${SONOSCHOOL_ADDRESS} ${SONOSCHOOL_ADDRESS_DETAIL}`;
const SONOSCHOOL_PHONE = '010-3859-8070';
const FALLBACK_LATITUDE = 37.204188;
const FALLBACK_LONGITUDE = 127.073304;

const loadKakaoMapsSdk = (appKey: string): Promise<KakaoMapsApi> => {
  return new Promise((resolve, reject) => {
    const handleSdkReady = () => {
      const kakaoMaps = (window as KakaoWindow).kakao?.maps;
      if (!kakaoMaps) {
        reject(new Error('Kakao maps object is unavailable.'));
        return;
      }

      kakaoMaps.load(() => {
        resolve(kakaoMaps);
      });
    };

    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID);
    if (existingScript) {
      if ((window as KakaoWindow).kakao?.maps) {
        handleSdkReady();
        return;
      }

      existingScript.addEventListener('load', handleSdkReady, { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          reject(new Error('Failed to load Kakao maps SDK.'));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&libraries=services&autoload=false`;
    script.addEventListener('load', handleSdkReady, { once: true });
    script.addEventListener(
      'error',
      () => {
        reject(new Error('Failed to load Kakao maps SDK.'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });
};

const HomeLocationSection = () => {
  const [mapErrorMessage, setMapErrorMessage] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const hasKakaoMapApiKey = Boolean(env.kakaoMapApiKey);

  useEffect(() => {
    if (!hasKakaoMapApiKey) {
      return;
    }

    let disposed = false;

    loadKakaoMapsSdk(env.kakaoMapApiKey)
      .then((kakaoMaps) => {
        if (disposed || !mapContainerRef.current) {
          return;
        }

        const initialPosition = new kakaoMaps.LatLng(FALLBACK_LATITUDE, FALLBACK_LONGITUDE);
        const map = new kakaoMaps.Map(mapContainerRef.current, {
          center: initialPosition,
          level: 3,
        });
        const marker = new kakaoMaps.Marker({ position: initialPosition });

        marker.setMap(map);
        kakaoMapRef.current = map;

        const geocoder = new kakaoMaps.services.Geocoder();
        geocoder.addressSearch(SONOSCHOOL_MAP_SEARCH_ADDRESS, (result, status) => {
          if (disposed) {
            return;
          }

          if (status !== kakaoMaps.services.Status.OK || result.length === 0) {
            setMapErrorMessage('주소를 지도에서 찾지 못해 기본 좌표를 표시하고 있습니다.');
            return;
          }

          const first = result[0];
          const latitude = Number(first.y);
          const longitude = Number(first.x);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            setMapErrorMessage('지도 좌표 변환에 실패해 기본 좌표를 표시하고 있습니다.');
            return;
          }

          const position = new kakaoMaps.LatLng(latitude, longitude);
          marker.setPosition(position);
          map.setCenter(position);
          map.setLevel(3);
          setMapErrorMessage('');
        });

        window.requestAnimationFrame(() => {
          map.relayout();
        });
      })
      .catch(() => {
        if (!disposed) {
          setMapErrorMessage('카카오 지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      });

    return () => {
      disposed = true;
    };
  }, [hasKakaoMapApiKey]);

  useEffect(() => {
    const handleResize = () => {
      kakaoMapRef.current?.relayout();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const visibleMapMessage = hasKakaoMapApiKey
    ? mapErrorMessage
    : '카카오 지도 API 키가 설정되지 않았습니다.';

  return (
    <section
      aria-labelledby='home-location-heading'
      className={styles['section']}
      id='home-location'
    >
      <div className={styles['inner']}>
        <h2 className={styles['heading']} id='home-location-heading'>
          더 정확한 진단을 향한 소노스쿨 오시는 길
        </h2>

        <div className={styles['contentGrid']}>
          <div className={styles['mapCard']}>
            <div
              aria-label='소노스쿨 국제초음파연수원 위치 지도'
              className={styles['mapCanvas']}
              data-lenis-prevent
              ref={mapContainerRef}
              role='img'
            />
            {visibleMapMessage ? (
              <p className={styles['mapMessage']} role='status'>
                {visibleMapMessage}
              </p>
            ) : null}
          </div>

          <div className={styles['informationPanel']}>
            <address className={styles['addressBlock']}>
              <strong>{SONOSCHOOL_ADDRESS}</strong>
              <span>{SONOSCHOOL_ADDRESS_DETAIL}</span>
            </address>

            <dl className={styles['detailList']}>
              <div className={styles['detailRow']}>
                <dt>전화번호</dt>
                <dd>
                  <a href={`tel:${SONOSCHOOL_PHONE.replaceAll('-', '')}`}>{SONOSCHOOL_PHONE}</a>
                </dd>
              </div>
            </dl>

            <dl className={styles['hoursList']}>
              <div className={styles['detailRow']}>
                <dt>평일</dt>
                <dd>09:00 ~ 18:00</dd>
              </div>
              <div className={styles['detailRow']}>
                <dt>점심시간</dt>
                <dd>12:00 ~ 13:00</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeLocationSection;
