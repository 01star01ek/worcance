import React, { useState, useEffect, useRef } from 'react';

// 빈 데이터로 시작
const sampleData = {
  착한가격업소: [],
  숙박업소: [],
  모범음식점: [],
  요식업소: [],
  스마트도서관: [],
  테마투어: [],
  스탬프투어명소: []
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

  // 다양한 컬럼명을 표준화하는 함수
  const normalizeData = (item, dataType) => {
    // 기본 정보 매핑
    const name = item['업소명'] || item['장소명'] || item['테마명'] || item['시설명'] || item['name'] || `${dataType}`;
    
    // 주소 정보
    const address = item['도로명주소'] || item['주소'] || item['소재지도로명주소'] || item['address'] || '';
    const oldAddress = item['지번주소'] || item['소재지지번주소'] || item['oldAddress'] || '';
    
    // 좌표 정보 - 다양한 컬럼명 지원
    const lat = parseFloat(
      item['위도'] || item['lat'] || item['latitude'] || item['y좌표'] || item['Y좌표'] || null
    );
    const lng = parseFloat(
      item['경도'] || item['lng'] || item['longitude'] || item['x좌표'] || item['X좌표'] || null
    );
    
    // 업종/카테고리 정보
    const category = item['업종'] || item['테마명'] || item['분류'] || item['category'] || '';
    
    // 메뉴/상품 정보
    const mainMenu = item['주요품목'] || item['대표메뉴'] || item['메뉴'] || item['mainMenu'] || '';
    
    // 가격 정보
    const price = item['가격'] || item['요금'] || item['이용료'] || item['price'] || '';
    
    // 설명 정보
    const description = item['관광지설명'] || item['설명'] || item['소개'] || item['비고'] || item['description'] || '';
    
    // 테마투어 특별 처리
    let theme = '';
    let course = '';
    if (dataType === '테마투어') {
      theme = item['테마'] || item['테마명'] || item['요일'] || '';
      course = item['코스정보'] || item['월요일코스'] || item['화요일코스'] || item['수요일코스'] || 
              item['목요일코스'] || item['금요일코스'] || item['토요일코스'] || item['일요일코스'] || '';
    }
    
    // 스탬프투어명소 특별 처리
    let stampHouse = '';
    if (dataType === '스탬프투어명소') {
      stampHouse = item['스탬프하우스'] || item['스탬프위치'] || '';
    }
    
    // 운영시간 정보
    const summerOpen = item['하절기개방시작시간'] || item['개방시간'] || item['운영시작시간'] || '';
    const summerClose = item['하절기개방종료시간'] || item['폐장시간'] || item['운영종료시간'] || '';
    const winterOpen = item['동절기개방시작시간'] || item['겨울개방시작시간'] || '';
    const winterClose = item['동절기개방종료시간'] || item['겨울개방종료시간'] || '';
    const closedDays = item['휴관일'] || item['휴무일'] || item['쉬는날'] || '';
    
    // 연락처 정보
    const phone = item['전화번호'] || item['연락처'] || item['tel'] || item['phone'] || '';
    
    // 홈페이지 정보
    const website = item['홈페이지'] || item['웹사이트'] || item['URL'] || item['website'] || '';

    return {
      id: `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: dataType,
      name: name,
      category: category,
      mainMenu: mainMenu,
      price: price,
      theme: theme,
      course: course,
      address: address,
      oldAddress: oldAddress,
      lat: lat,
      lng: lng,
      description: description,
      stampHouse: stampHouse,
      summerOpen: summerOpen,
      summerClose: summerClose,
      winterOpen: winterOpen,
      winterClose: winterClose,
      closedDays: closedDays,
      phone: phone,
      website: website
    };
  };

  // 주소를 좌표로 변환하는 함수 (카카오 지오코더 사용)
  const geocodeAddress = async (address) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        resolve(null);
        return;
      }
      
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({
            lat: parseFloat(result[0].y),
            lng: parseFloat(result[0].x)
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  // 좌표가 없는 데이터에 대해 지오코딩 수행
  const processDataWithGeocoding = async (processedData) => {
    const dataWithCoords = [];
    
    for (const item of processedData) {
      if (item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng)) {
        // 이미 좌표가 있는 경우
        dataWithCoords.push(item);
      } else if (item.address && item.address.trim() !== '') {
        // 주소만 있는 경우 지오코딩 시도
        console.log(`Geocoding address: ${item.address}`);
        const coords = await geocodeAddress(item.address);
        
        if (coords) {
          dataWithCoords.push({
            ...item,
            lat: coords.lat,
            lng: coords.lng
          });
          console.log(`✓ Geocoded: ${item.name} -> ${coords.lat}, ${coords.lng}`);
        } else {
          console.log(`✗ Failed to geocode: ${item.name} - ${item.address}`);
          // 좌표를 얻지 못한 경우에도 데이터는 보관 (사이드바에서 확인 가능)
          dataWithCoords.push({
            ...item,
            lat: null,
            lng: null,
            geocodeFailed: true
          });
        }
        
        // API 호출 제한을 고려하여 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return dataWithCoords;
  };

  // CSV 데이터 로드 함수 - 다양한 형식 지원
  const loadCSVData = async () => {
    setLoading(true);
    
    const possibleFileNames = [
      '강원특별자치도 춘천시_착한가격업소.csv',
      '강원특별자치도 춘천시_숙박업소.csv', 
      '강원특별자치도 춘천시_모범음식점.csv',
      '강원특별자치도 춘천시_요식업소.csv',
      '강원특별자치도 춘천시_스마트도서관.csv',
      '강원특별자치도 춘천시_테마투어.csv',
      '강원특별자치도 춘천시_스탬프투어명소.csv',
      // 언더스코어 버전
      '강원특별자치도_춘천시_착한가격업소.csv',
      '강원특별자치도_춘천시_숙박업소.csv',
      '강원특별자치도_춘천시_모범음식점.csv',
      '강원특별자치도_춘천시_요식업소.csv',
      '강원특별자치도_춘천시_스마트도서관.csv',
      '강원특별자치도_춘천시_테마투어.csv',
      '강원특별자치도_춘천시_스탬프투어명소.csv',
      // 간단한 버전
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

    // 파일명으로 데이터 타입 결정
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

    // 각 파일 로드 시도
    for (let fileName of possibleFileNames) {
      try {
        const response = await fetch(`/${fileName}`);
        if (!response.ok) continue;
        
        const csvContent = await response.text();
        console.log(`✓ Successfully loaded: ${fileName}`);
        
        const Papa = (await import('papaparse')).default;
        
        const parsed = Papa.parse(csvContent, {
          header: true,
          dynamicTyping: false, // 문자열로 유지하여 안전하게 처리
          skipEmptyLines: true,
          delimiter: ',',
          encoding: 'utf8'
        });

        const dataType = getDataType(fileName);
        if (dataType && parsed.data.length > 0) {
          console.log(`Processing ${fileName} with columns:`, parsed.meta.fields);
          
          // 데이터 정규화
          const processedData = parsed.data
            .map(item => normalizeData(item, dataType))
            .filter(item => {
              // 이름이 있고, 좌표나 주소 중 하나라도 있는 데이터만 포함
              const hasName = item.name && item.name.trim() !== '';
              const hasValidCoords = item.lat && item.lng && !isNaN(item.lat) && !isNaN(item.lng);
              const hasAddress = item.address && item.address.trim() !== '';
              return hasName && (hasValidCoords || hasAddress);
            });

          if (processedData.length > 0) {
            console.log(`Found ${processedData.length} items in ${fileName}, processing coordinates...`);
            
            // 지오코딩을 통해 좌표 보완
            const dataWithCoords = await processDataWithGeocoding(processedData);
            
            newData[dataType] = dataWithCoords;
            console.log(`Final processed: ${dataWithCoords.filter(item => item.lat && item.lng).length} items with coordinates from ${fileName}`);
            loadedCount++;
          }
        }
      } catch (error) {
        console.log(`Failed to load ${fileName}:`, error.message);
        continue;
      }
    }

    if (loadedCount > 0) {
      console.log(`Successfully loaded ${loadedCount} CSV files`);
      setTourismData(newData);
    } else {
      console.log('No CSV files found, using empty data');
    }
    
    setLoading(false);
  };

  // 카카오 지도 초기화
  useEffect(() => {
    const initializeKakaoMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        console.log('카카오맵 API가 로드되지 않았습니다.');
        showFallbackMap();
        return;
      }

      try {
        const container = mapRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(37.8813, 127.7300), // 춘천시 중심
          level: 8 // 확대 레벨
        };

        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);
        
        console.log('카카오맵 초기화 완료');
      } catch (error) {
        console.error('카카오맵 초기화 실패:', error);
        showFallbackMap();
      }
    };

    const showFallbackMap = () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="
            width: 100%; 
            height: 100%; 
            background: linear-gradient(135deg, #ffeb3b 0%, #ff9800 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #333;
            font-family: 'Malgun Gothic', Arial, sans-serif;
          ">
            <div style="
              background: rgba(255, 255, 255, 0.95);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 450px;
              margin: 20px;
              border: 3px solid #ff9800;
            ">
              <div style="font-size: 64px; margin-bottom: 20px;">🗺️</div>
              <h3 style="margin: 0 0 20px 0; font-size: 28px; color: #ff9800;">춘천시 관광지도</h3>
              <p style="margin: 0 0 25px 0; line-height: 1.8; font-size: 16px; color: #555;">
                카카오맵 API 키가 적용되었습니다!<br>
                CSV 파일을 업로드하면 지도에 표시됩니다 😊
              </p>
              <div style="
                background: linear-gradient(45deg, #ffeb3b, #ff9800);
                padding: 20px;
                border-radius: 15px;
                color: white;
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
              ">
                📂 CSV 파일을 public/ 폴더에 넣어주세요!
              </div>
              <p style="margin: 0; font-size: 14px; color: #777;">
                좌측 사이드바에서 카테고리 필터링이 가능합니다
              </p>
            </div>
          </div>
        `;
        setMap({ fake: true });
      }
    };

    // 카카오맵 API 로드
    if (!window.kakao) {
      const script = document.createElement('script');
      script.async = true;
      script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=04ff5f4f67ecce60ecc682665031e783&libraries=services&autoload=false';
      
      script.onload = () => {
        window.kakao.maps.load(() => {
          initializeKakaoMap();
        });
      };
      
      script.onerror = () => {
        console.error('카카오맵 API 로드 실패');
        showFallbackMap();
      };
      
      document.head.appendChild(script);
    } else {
      window.kakao.maps.load(() => {
        initializeKakaoMap();
      });
    }
  }, []);

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
    if (!map || map.fake) return;

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
        const position = new window.kakao.maps.LatLng(item.lat, item.lng);
        
        // 커스텀 마커 이미지 생성
        const markerImage = createCustomMarker(item.type);
        
        const marker = new window.kakao.maps.Marker({
          position: position,
          image: markerImage,
          map: map
        });

        // 인포윈도우 생성
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `
            <div style="padding: 15px; min-width: 200px; font-family: 'Malgun Gothic', sans-serif;">
              <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">
                ${getTypeIcon(item.type)} ${item.name}
              </div>
              <div style="font-size: 13px; color: #666; margin-bottom: 6px;">
                ${item.address || ''}
              </div>
              ${item.mainMenu ? `
                <div style="font-size: 12px; color: #555; margin-bottom: 4px;">
                  <span style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">
                    ${item.mainMenu}
                  </span>
                </div>
              ` : ''}
              ${item.price ? `
                <div style="font-size: 14px; color: #e74c3c; font-weight: bold;">
                  ${item.price}
                </div>
              ` : ''}
            </div>
          `,
          removable: true
        });

        // 마커 클릭 이벤트
        window.kakao.maps.event.addListener(marker, 'click', () => {
          setSelectedMarker(item);
          infowindow.open(map, marker);
        });

        // 마커 마우스오버 이벤트 (호버)
        window.kakao.maps.event.addListener(marker, 'mouseover', () => {
          marker.setImage(createCustomMarker(item.type, true)); // 호버 상태
        });

        // 마커 마우스아웃 이벤트
        window.kakao.maps.event.addListener(marker, 'mouseout', () => {
          marker.setImage(createCustomMarker(item.type, false)); // 일반 상태
        });

        newMarkers.push(marker);
      }
    });

    setMarkers(newMarkers);
  };

  // 커스텀 마커 생성 함수
  const createCustomMarker = (type, isHover = false) => {
    const color = getTypeColor(type);
    const icon = getTypeIcon(type);
    const size = isHover ? 32 : 28;
    
    const imageSrc = `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-size="14" fill="white">${icon}</text>
        <path d="M${size/2 - 4} ${size - 4} L${size/2} ${size + 4} L${size/2 + 4} ${size - 4} Z" fill="${color}" stroke="white" stroke-width="1"/>
      </svg>
    `)}`;

    return new window.kakao.maps.MarkerImage(
      imageSrc,
      new window.kakao.maps.Size(size, size + 8),
      { offset: new window.kakao.maps.Point(size/2, size + 8) }
    );
  };

  const getTypeIcon = (type) => {
    const icons = {
      착한가격업소: '💰',
      숙박업소: '🏨',
      모범음식점: '🍽️',
      요식업소: '☕',
      스마트도서관: '📚',
      테마투어: '🚌',
      스탬프투어명소: '📍'
    };
    return icons[type] || '📍';
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
          <h2>🗺️ 춘천시 관광정보</h2>
          {loading && <div className="loading-indicator">데이터 로딩 중...</div>}
        </div>
        
        <div className="filter-section">
          <h3>카테고리 필터</h3>
          <div className="filter-grid">
            {Object.keys(selectedTypes).map(type => {
              const count = tourismData[type] ? tourismData[type].length : 0;
              return (
                <label key={type} className="filter-item">
                  <input
                    type="checkbox"
                    checked={selectedTypes[type]}
                    onChange={() => handleTypeToggle(type)}
                  />
                  <span 
                    className="filter-indicator"
                    style={{ backgroundColor: getTypeColor(type) }}
                  >
                    {getTypeIcon(type)}
                  </span>
                  <span className="filter-label">
                    {type} <span className="count">({count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="office-section">
          <label className="office-toggle">
            <input
              type="checkbox"
              checked={showOfficeInfo}
              onChange={() => setShowOfficeInfo(!showOfficeInfo)}
            />
            <span className="office-label">🏢 공유오피스/대학 강의실 가능 여부</span>
          </label>
          {showOfficeInfo && (
            <div className="office-info">
              <p>📋 데이터 준비 중입니다...</p>
              <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                추후 업데이트 예정입니다.
              </p>
            </div>
          )}
        </div>

        {selectedMarker && (
          <div className="marker-details">
            <div className="details-header">
              <h3>{getTypeIcon(selectedMarker.type)} {selectedMarker.name}</h3>
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
                  {getTypeIcon(selectedMarker.type)} {selectedMarker.type}
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
                  <span className="menu">{selectedMarker.mainMenu}</span>
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
                  <span className="course">{selectedMarker.course}</span>
                </div>
              )}
              
              <div className="detail-item">
                <span className="label">주소:</span>
                <span className="address">{selectedMarker.address}</span>
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
                  <h4>⏰ 운영시간</h4>
                  {selectedMarker.summerOpen && (
                    <div className="hours">
                      <span className="season">☀️ 하절기:</span>
                      <span>{selectedMarker.summerOpen} - {selectedMarker.summerClose}</span>
                    </div>
                  )}
                  {selectedMarker.winterOpen && (
                    <div className="hours">
                      <span className="season">❄️ 동절기:</span>
                      <span>{selectedMarker.winterOpen} - {selectedMarker.winterClose}</span>
                    </div>
                  )}
                  {selectedMarker.closedDays && (
                    <div className="hours">
                      <span className="season">🚫 휴관일:</span>
                      <span>{selectedMarker.closedDays}</span>
                    </div>
                  )}
                </div>
              )}
              
              {selectedMarker.phone && (
                <div className="detail-item">
                  <span className="label">연락처:</span>
                  <span className="phone">{selectedMarker.phone}</span>
                </div>
              )}
              
              {selectedMarker.website && (
                <div className="detail-item">
                  <span className="label">홈페이지:</span>
                  <a href={selectedMarker.website} target="_blank" rel="noopener noreferrer" className="website">
                    방문하기 🔗
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="map-section">
        <div ref={mapRef} className="map-container"></div>
        
        <div className="map-legend">
          <h4>🎯 범례</h4>
          <div className="legend-items">
            {Object.keys(selectedTypes).filter(type => selectedTypes[type]).map(type => (
              <div key={type} className="legend-item">
                <span 
                  className="legend-color"
                  style={{ backgroundColor: getTypeColor(type) }}
                >
                  {getTypeIcon(type)}
                </span>
                <span>{type}</span>
              </div>
            ))}
          </div>
          {Object.keys(selectedTypes).filter(type => selectedTypes[type]).length === 0 && (
            <p style={{ fontSize: '12px', color: '#999', margin: '10px 0' }}>
              표시할 카테고리를 선택해주세요
            </p>
          )}
        </div>
        
        <div className="map-controls">
          <button 
            className="control-btn"
            onClick={() => {
              if (map && !map.fake) {
                map.setLevel(Math.max(map.getLevel() - 1, 1));
              }
            }}
            title="확대"
          >
            🔍+
          </button>
          <button 
            className="control-btn"
            onClick={() => {
              if (map && !map.fake) {
                map.setLevel(Math.min(map.getLevel() + 1, 14));
              }
            }}
            title="축소"
          >
            🔍-
          </button>
          <button 
            className="control-btn center-btn"
            onClick={() => {
              if (map && !map.fake) {
                map.setCenter(new window.kakao.maps.LatLng(37.8813, 127.7300));
                map.setLevel(8);
              }
            }}
            title="춘천시 중심으로 이동"
          >
            🏠
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChuncheonTourismMap;