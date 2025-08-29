import React, { useState, useEffect, useRef } from 'react';

// 샘플 데이터 (실제로는 CSV에서 로드)
const sampleData = {
  착한가격업소: [
    {
      id: 1,
      type: '착한가격업소',
      name: '행복한두부',
      category: '한식_일반',
      mainMenu: '두부찌개',
      price: '8000원',
      address: '강원특별자치도 춘천시 둥지길 4',
      oldAddress: '강원특별자치도 춘천시 효자동 651-6',
      lat: 37.87474796,
      lng: 127.7353755,
      description: '맛있는 두부찌개 전문점'
    }
  ],
  스탬프투어명소: [
    {
      id: 2,
      type: '스탬프투어명소',
      name: '육림고개',
      theme: '뉴트로관광지',
      address: '강원특별자치도 춘천시 중앙로77번길 34',
      oldAddress: '강원특별자치도 춘천시 죽림동 4-2',
      stampHouse: '육림고개 쉼터 앞',
      description: '과거 쇠퇴했던 상권에 청년들의 손길이 닿아 공방, 맛집, 카페 등이 가득한 춘천의 새로운 여행명소로 재탄생되었다.',
      lat: 37.8813,
      lng: 127.7300,
      summerOpen: '0:00',
      summerClose: '0:00',
      winterOpen: '0:00', 
      winterClose: '0:00',
      closedDays: '없음'
    }
  ],
  테마투어: [
    {
      id: 3,
      type: '테마투어',
      name: '월요일 코스',
      theme: '월요일',
      course: '소양강댐-공지천-킹카누나루터/송암스포츠타운-소양강 스카이워크',
      lat: 37.8750,
      lng: 127.7340,
      description: '춘천의 대표 관광지들을 하루에 둘러볼 수 있는 테마 코스'
    }
  ],
  숙박업소: [
    {
      id: 5,
      type: '숙박업소',
      name: '춘천호텔',
      category: '호텔',
      address: '강원특별자치도 춘천시 공지로 456',
      lat: 37.8800,
      lng: 127.7320,
      description: '춘천 중심가의 편리한 숙박시설'
    }
  ],
  모범음식점: [
    {
      id: 6,
      type: '모범음식점',
      name: '소양강가든',
      category: '한식',
      mainMenu: '닭갈비',
      price: '12000원',
      address: '강원특별자치도 춘천시 소양로 789',
      lat: 37.8770,
      lng: 127.7280,
      description: '춘천 닭갈비 원조 맛집'
    }
  ]
};

const ChuncheonTourismMap = () => {
  const [selectedTypes, setSelectedTypes] = useState({
    착한가격업소: true,
    숙박업소: true,
    모범음식점: true,
    요식업소: true,
    스마트도서관: true,
    테마투어: true,
    스탬프투어명소: true
  });

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showOfficeInfo, setShowOfficeInfo] = useState(false);
  const [tourismData, setTourismData] = useState(sampleData);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindow, setInfoWindow] = useState(null);

  // CSV 데이터 로드 함수
  const loadCSVData = async () => {
    setLoading(true);
    
    // 가능한 파일명 패턴들
    const possibleFileNames = [
      '강원특별자치도 춘천시_착한가격업소.csv',
      '강원특별자치도 춘천시_숙박업소.csv', 
      '강원특별자치도 춘천시_모범음식점.csv',
      '강원특별자치도 춘천시_요식업소.csv',
      '강원특별자치도 춘천시_스마트도서관.csv',
      '강원특별자치도 춘천시_테마투어.csv',
      '강원특별자치도 춘천시_스탬프투어명소.csv',
      '착한가격업소.csv',
      '숙박업소.csv',
      '모범음식점.csv',
      '요식업소.csv',
      '스마트도서관.csv',
      '테마투어.csv',
      '스탬프투어명소.csv'
    ];

    const newData = { ...sampleData };
    let loadedCount = 0;

    // 파일 타입 매핑
    const getDataType = (fileName) => {
      if (fileName.includes('착한가격업소')) return '착한가격업소';
      if (fileName.includes('숙박업소')) return '숙박업소';
      if (fileName.includes('모범음식점')) return '모범음식점';
      if (fileName.includes('요식업소')) return '요식업소';
      if (fileName.includes('스마트도서관')) return '스마트도서관';
      if (fileName.includes('테마투어')) return '테마투어';
      if (fileName.includes('스탬프투어명소')) return '스탬프투어명소';
      return null;
    };

    // 모든 가능한 파일명 시도
    for (let fileName of possibleFileNames) {
      try {
        const response = await fetch(`/${fileName}`);
        if (!response.ok) continue;
        
        const csvContent = await response.text();
        console.log(`✓ Successfully loaded: ${fileName}`);
        
        // papaparse 동적 import
        const Papa = (await import('papaparse')).default;
        
        const parsed = Papa.parse(csvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimiter: ',',
          encoding: 'utf8'
        });

        const dataType = getDataType(fileName);
        if (dataType && parsed.data.length > 0) {
          // 데이터 정규화
          newData[dataType] = parsed.data.map((item, index) => {
            const lat = parseFloat(item['위도']) || parseFloat(item['lat']) || null;
            const lng = parseFloat(item['경도']) || parseFloat(item['lng']) || null;
            
            return {
              id: `${dataType}_${index}`,
              type: dataType,
              name: item['업소명'] || item['장소명'] || item['테마명'] || item['name'] || `${dataType}_${index}`,
              category: item['업종'] || item['테마명'] || item['category'],
              mainMenu: item['주요품목'] || item['mainMenu'],
              price: item['가격'] || item['price'],
              theme: item['테마명'] || item['theme'],
              course: item['코스정보'] || item['월요일코스'] || item['course'],
              address: item['도로명주소'] || item['address'],
              oldAddress: item['지번주소'] || item['oldAddress'],
              lat: lat,
              lng: lng,
              description: item['관광지설명'] || item['설명'] || item['description'] || '',
              stampHouse: item['스탬프하우스'] || item['stampHouse'],
              summerOpen: item['하절기개방시작시간'] || item['summerOpen'],
              summerClose: item['하절기개방종료시간'] || item['summerClose'],
              winterOpen: item['동절기개방시작시간'] || item['winterOpen'],
              winterClose: item['동절기개방종료시간'] || item['winterClose'],
              closedDays: item['휴관일'] || item['closedDays']
            };
          }).filter(item => item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng));

          console.log(`Processed ${newData[dataType].length} items from ${fileName}`);
          loadedCount++;
        }
      } catch (error) {
        continue;
      }
    }

    if (loadedCount > 0) {
      console.log(`Successfully loaded ${loadedCount} CSV files`);
    } else {
      console.log('No CSV files found, using sample data');
    }
    
    setTourismData(newData);
    setLoading(false);
  };

  // 구글 맵 초기화
  useEffect(() => {
    const initializeGoogleMap = () => {
      if (!window.google) {
        console.log('Google Maps API not loaded yet');
        return;
      }

      const mapOptions = {
        center: { lat: 37.8813, lng: 127.7300 }, // 춘천시 중심
        zoom: 12,
        mapTypeId: 'roadmap'
      };

      const googleMap = new window.google.maps.Map(mapRef.current, mapOptions);
      const googleInfoWindow = new window.google.maps.InfoWindow();
      
      setMap(googleMap);
      setInfoWindow(googleInfoWindow);
    };

    // Google Maps API 로드
    if (!window.google) {
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      // 실제 프로젝트에서는 본인의 Google Maps API 키를 사용하세요
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap`;
      
      // 콜백 함수를 전역으로 설정
      window.initMap = initializeGoogleMap;
      
      script.onerror = () => {
        console.error('Google Maps API failed to load');
        // API 키 없이도 작동하도록 대체 방법
        initializeMapWithoutAPI();
      };
      
      document.head.appendChild(script);
    } else {
      initializeGoogleMap();
    }
  }, []);

  // API 키 없이도 작동하는 대체 맵
  const initializeMapWithoutAPI = () => {
    if (mapRef.current) {
      mapRef.current.innerHTML = `
        <div style="
          width: 100%; 
          height: 100%; 
          background: linear-gradient(45deg, #e3f2fd, #bbdefb);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
        ">
          <div style="
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            margin: 20px;
          ">
            <h3 style="color: #1976d2; margin-bottom: 15px;">🗺️ 춘천시 관광지도</h3>
            <p style="color: #666; line-height: 1.5; margin-bottom: 15px;">
              Google Maps API 키가 필요합니다.<br>
              현재는 샘플 데이터로 동작합니다.
            </p>
            <div style="
              background: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              font-size: 12px;
              color: #777;
            ">
              좌측 사이드바에서 관광지 정보를 확인하세요!
            </div>
          </div>
        </div>
      `;
      
      // 가짜 맵 객체 설정 (마커 업데이트가 동작하도록)
      setMap({ fake: true });
    }
  };

  // 컴포넌트 마운트 시 CSV 데이터 로드
  useEffect(() => {
    loadCSVData();
  }, []);

  // 마커 업데이트
  useEffect(() => {
    if (map && !loading) {
      updateMarkers();
    }
  }, [selectedTypes, map, tourismData, loading]);

  const updateMarkers = () => {
    if (!map || map.fake) return; // 가짜 맵인 경우 마커 생성 안함

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    
    const newMarkers = [];
    const allData = [];

    // 선택된 타입의 데이터만 수집
    Object.keys(selectedTypes).forEach(type => {
      if (selectedTypes[type] && tourismData[type]) {
        allData.push(...tourismData[type]);
      }
    });

    // 마커 생성
    allData.forEach(item => {
      if (item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng)) {
        const marker = new window.google.maps.Marker({
          position: { lat: item.lat, lng: item.lng },
          map: map,
          title: item.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: getTypeColor(item.type),
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2
          }
        });

        // 마커 클릭 이벤트
        marker.addListener('click', () => {
          setSelectedMarker(item);
          
          // 정보창 표시
          const infoContent = `
            <div style="padding: 10px; max-width: 200px;">
              <h4 style="margin: 0 0 8px 0; color: #333;">${item.name}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">${item.address || ''}</p>
              ${item.price ? `<p style="margin: 5px 0 0 0; color: #e74c3c; font-weight: bold;">${item.price}</p>` : ''}
            </div>
          `;
          
          infoWindow.setContent(infoContent);
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const getTypeColor = (type) => {
    const colors = {
      착한가격업소: '#FF6B6B',
      숙박업소: '#4ECDC4',
      모범음식점: '#45B7D1',
      요식업소: '#96CEB4',
      스마트도서관: '#FFEAA7',
      테마투어: '#DDA0DD',
      스탬프투어명소: '#FFB347'
    };
    return colors[type] || '#666';
  };

  return (
    <div className="tourism-map-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>춘천시 관광정보</h2>
          {loading && <div className="loading-indicator">데이터 로딩 중...</div>}
        </div>
        
        <div className="filter-section">
          <h3>카테고리 필터</h3>
          <div className="filter-grid">
            {Object.keys(selectedTypes).map(type => (
              <label key={type} className="filter-item">
                <input
                  type="checkbox"
                  checked={selectedTypes[type]}
                  onChange={() => handleTypeToggle(type)}
                />
                <span 
                  className="filter-indicator"
                  style={{ backgroundColor: getTypeColor(type) }}
                ></span>
                <span className="filter-label">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="office-section">
          <label className="office-toggle">
            <input
              type="checkbox"
              checked={showOfficeInfo}
              onChange={() => setShowOfficeInfo(!showOfficeInfo)}
            />
            <span className="office-label">공유오피스/대학 강의실 가능 여부</span>
          </label>
          {showOfficeInfo && (
            <div className="office-info">
              <p>데이터 준비 중...</p>
            </div>
          )}
        </div>

        {selectedMarker && (
          <div className="marker-details">
            <div className="details-header">
              <h3>{selectedMarker.name}</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedMarker(null)}
              >
                ×
              </button>
            </div>
            <div className="details-content">
              <div className="detail-item">
                <span className="label">분류:</span>
                <span 
                  className="type-badge"
                  style={{ backgroundColor: getTypeColor(selectedMarker.type) }}
                >
                  {selectedMarker.type}
                </span>
              </div>
              
              {selectedMarker.category && (
                <div className="detail-item">
                  <span className="label">업종:</span>
                  <span>{selectedMarker.category}</span>
                </div>
              )}
              
              {selectedMarker.mainMenu && (
                <div className="detail-item">
                  <span className="label">주요메뉴:</span>
                  <span>{selectedMarker.mainMenu}</span>
                </div>
              )}
              
              {selectedMarker.price && (
                <div className="detail-item">
                  <span className="label">가격:</span>
                  <span className="price">{selectedMarker.price}</span>
                </div>
              )}
              
              {selectedMarker.theme && (
                <div className="detail-item">
                  <span className="label">테마:</span>
                  <span>{selectedMarker.theme}</span>
                </div>
              )}
              
              {selectedMarker.course && (
                <div className="detail-item">
                  <span className="label">코스:</span>
                  <span>{selectedMarker.course}</span>
                </div>
              )}
              
              <div className="detail-item">
                <span className="label">주소:</span>
                <span>{selectedMarker.address}</span>
              </div>
              
              {selectedMarker.description && (
                <div className="detail-item description">
                  <span className="label">설명:</span>
                  <p>{selectedMarker.description}</p>
                </div>
              )}
              
              {selectedMarker.stampHouse && (
                <div className="detail-item">
                  <span className="label">스탬프하우스:</span>
                  <span>{selectedMarker.stampHouse}</span>
                </div>
              )}
              
              {(selectedMarker.summerOpen || selectedMarker.winterOpen) && (
                <div className="operating-hours">
                  <h4>운영시간</h4>
                  {selectedMarker.summerOpen && (
                    <div className="hours">
                      <span className="season">하절기:</span>
                      <span>{selectedMarker.summerOpen} - {selectedMarker.summerClose}</span>
                    </div>
                  )}
                  {selectedMarker.winterOpen && (
                    <div className="hours">
                      <span className="season">동절기:</span>
                      <span>{selectedMarker.winterOpen} - {selectedMarker.winterClose}</span>
                    </div>
                  )}
                  {selectedMarker.closedDays && (
                    <div className="hours">
                      <span className="season">휴관일:</span>
                      <span>{selectedMarker.closedDays}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="map-section">
        <div ref={mapRef} className="map-container"></div>
        
        <div className="map-legend">
          <h4>범례</h4>
          <div className="legend-items">
            {Object.keys(selectedTypes).filter(type => selectedTypes[type]).map(type => (
              <div key={type} className="legend-item">
                <span 
                  className="legend-color"
                  style={{ backgroundColor: getTypeColor(type) }}
                ></span>
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChuncheonTourismMap;