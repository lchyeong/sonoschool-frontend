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

interface KakaoPlaceSearchResult {
  address_name?: string;
  id?: string;
  place_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
}

interface KakaoGeocoder {
  addressSearch: (
    address: string,
    callback: (result: KakaoGeocoderResult[], status: string) => void,
  ) => void;
}

interface KakaoPlaces {
  keywordSearch: (
    keyword: string,
    callback: (result: KakaoPlaceSearchResult[], status: string) => void,
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
    Places: new () => KakaoPlaces;
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

interface NearbyParkingLot {
  address: string;
  name: string;
  searchKeyword?: string;
}

const KAKAO_MAP_SCRIPT_ID = 'sonoschool-kakao-map-sdk';
const SONOSCHOOL_ADDRESS = '경기도 화성시 동탄구 동탄지성로 17';
const SONOSCHOOL_ADDRESS_DETAIL = 'B1층 101호 (반송동, 동탄 위버폴리스) 지하 1층 에스컬레이터 뒷편';
const SONOSCHOOL_MAP_SEARCH_ADDRESS = SONOSCHOOL_ADDRESS;
const FALLBACK_LATITUDE = 37.204188;
const FALLBACK_LONGITUDE = 127.073304;
const NEARBY_PARKING_LOTS: NearbyParkingLot[] = [
  {
    name: '한빛공영주차장',
    address: '경기 화성시 동탄구 동탄중심상가2길 21',
  },
  {
    name: '노작홍사용문학관 공영주차장',
    address: '경기 화성시 동탄구 노작로 206',
    searchKeyword: '노작홍사용문학관 공영주차장',
  },
] as const;

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
  const kakaoMapsRef = useRef<KakaoMapsApi | null>(null);
  const kakaoMarkerRef = useRef<KakaoMarker | null>(null);
  const kakaoGeocoderRef = useRef<KakaoGeocoder | null>(null);
  const kakaoPlacesRef = useRef<KakaoPlaces | null>(null);
  const hasKakaoMapApiKey = Boolean(env.kakaoMapApiKey);

  const moveMapToCoordinates = (longitude: string, latitude: string) => {
    const kakaoMaps = kakaoMapsRef.current;
    const map = kakaoMapRef.current;
    const marker = kakaoMarkerRef.current;

    if (!kakaoMaps || !map || !marker) {
      return false;
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      setMapErrorMessage('지도 좌표 변환에 실패해 현재 위치를 유지하고 있습니다.');
      return false;
    }

    const position = new kakaoMaps.LatLng(parsedLatitude, parsedLongitude);
    marker.setPosition(position);
    map.setCenter(position);
    map.setLevel(3);
    setMapErrorMessage('');
    return true;
  };

  const moveMapToAddress = (address: string) => {
    const kakaoMaps = kakaoMapsRef.current;
    const geocoder = kakaoGeocoderRef.current;

    if (!kakaoMaps || !geocoder) {
      return;
    }

    geocoder.addressSearch(address, (result, status) => {
      if (status !== kakaoMaps.services.Status.OK || result.length === 0) {
        setMapErrorMessage('주소를 지도에서 찾지 못해 현재 위치를 유지하고 있습니다.');
        return;
      }

      const first = result[0];
      moveMapToCoordinates(first.x, first.y);
    });
  };

  const moveMapToParkingLot = (parkingLot: (typeof NEARBY_PARKING_LOTS)[number]) => {
    const kakaoMaps = kakaoMapsRef.current;
    const places = kakaoPlacesRef.current;

    if (!parkingLot.searchKeyword || !kakaoMaps || !places) {
      moveMapToAddress(parkingLot.address);
      return;
    }

    places.keywordSearch(parkingLot.searchKeyword, (result, status) => {
      if (status !== kakaoMaps.services.Status.OK || result.length === 0) {
        moveMapToAddress(parkingLot.address);
        return;
      }

      const exactPlace =
        result.find((place) => place.place_name === parkingLot.searchKeyword) ?? result[0];
      moveMapToCoordinates(exactPlace.x, exactPlace.y);
    });
  };

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
        kakaoMapsRef.current = kakaoMaps;
        kakaoMapRef.current = map;
        kakaoMarkerRef.current = marker;

        const geocoder = new kakaoMaps.services.Geocoder();
        kakaoGeocoderRef.current = geocoder;
        kakaoPlacesRef.current = new kakaoMaps.services.Places();
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
      kakaoMapsRef.current = null;
      kakaoMapRef.current = null;
      kakaoMarkerRef.current = null;
      kakaoGeocoderRef.current = null;
      kakaoPlacesRef.current = null;
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
          소노스쿨 국제초음파연수원 오시는길
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
              <strong>
                <button
                  className={styles['addressMapButton']}
                  onClick={() => {
                    moveMapToAddress(SONOSCHOOL_MAP_SEARCH_ADDRESS);
                  }}
                  type='button'
                >
                  {SONOSCHOOL_ADDRESS}
                </button>
              </strong>
              <span>{SONOSCHOOL_ADDRESS_DETAIL}</span>
            </address>

            <div className={styles['parkingInfo']}>
              <p className={styles['buildingParkingText']}>건물내 주차장 2시간 무료</p>
              <div className={styles['parkingDivider']} aria-hidden='true' />
              <p className={styles['nearbyParkingTitle']}>주변 주차 이용안내</p>
              <ol className={styles['nearbyParkingList']}>
                {NEARBY_PARKING_LOTS.map((parkingLot) => (
                  <li key={parkingLot.name}>
                    <button
                      className={styles['parkingMapButton']}
                      onClick={() => {
                        moveMapToParkingLot(parkingLot);
                      }}
                      type='button'
                    >
                      {parkingLot.name}
                    </button>
                    <span>({parkingLot.address})</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeLocationSection;
