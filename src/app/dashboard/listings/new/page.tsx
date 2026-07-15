'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  IndianRupee, 
  CheckSquare, 
  Upload, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Trash2,
  Plus,
  FileText,
  Locate
} from 'lucide-react';
import { useToast, Button, Input, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  generateFileName,
  getListingDocPath,
  getListingImagePath,
  LISTING_DOCUMENTS_BUCKET,
  LISTING_IMAGES_BUCKET,
  validateDocument,
  validateImage,
} from '@/lib/upload';
import styles from './new.module.css';

export default function NewListing() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Data lists from backend APIs
  const [cities, setCities] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    listingFor: 'SALE',
    propertyType: 'APARTMENT',
    title: '',
    description: '',
    keyHighlights: [''],
    city: '',
    locality: '',
    subLocality: '',
    pinCode: '',
    fullAddress: '',
    landmark: '',
    bedrooms: '',
    bathrooms: '',
    balconies: '',
    carpetArea: '',
    builtUpArea: '',
    askingPrice: '',
    maintenanceCharges: '',
    securityDeposit: '',
    priceNegotiable: false,
    furnishing: 'UNFURNISHED',
    facing: 'EAST',
    possession: 'READY',
    ageOfProperty: '0_1_YEARS',
    ownership: 'FREEHOLD',
    parking: 'BOTH',
    parkingCount: '1',
    waterSupply: 'CORP_WELL',
    powerBackup: 'FULL',
    reraNumber: '',
    selectedAmenities: [], // array of ids
  });

  // Media States
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);

  // Fetch Cities and Amenities on mount
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [citiesRes, amenitiesRes] = await Promise.all([
          fetch('/api/cities'),
          fetch('/api/amenities'),
        ]);

        if (citiesRes.ok && amenitiesRes.ok) {
          const citiesData = await citiesRes.json();
          const amenitiesData = await amenitiesRes.json();
          setCities(citiesData.cities || []);
          setAmenities(amenitiesData.amenities || []);
        }
      } catch (err) {
        console.error('Error fetching cities/amenities:', err);
      }
    };
    fetchFormData();
  }, []);

  // Parse query parameters on mount to prefill form fields
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryType = params.get('type');
      const queryPropType = params.get('propertyType');
      
      const prefilledData: any = {};
      
      if (queryType) {
        const upperType = queryType.toUpperCase();
        if (upperType === 'SALE' || upperType === 'SELL') {
          prefilledData.listingFor = 'SALE';
        } else if (upperType === 'RENT') {
          prefilledData.listingFor = 'RENT';
        }
      }
      
      if (queryPropType) {
        const upperProp = queryPropType.toUpperCase();
        const validProps = ['APARTMENT', 'HOUSE', 'VILLA', 'PLOT', 'OFFICE', 'SHOP', 'PG'];
        if (validProps.includes(upperProp)) {
          prefilledData.propertyType = upperProp;
        } else if (upperProp === 'HOUSE_VILLA' || upperProp === 'HOUSE/VILLA') {
          prefilledData.propertyType = 'HOUSE';
        }
      }
      
      if (Object.keys(prefilledData).length > 0) {
        setFormData((prev: any) => ({
          ...prev,
          ...prefilledData
        }));
      }
    }
  }, []);

  // Update localities based on selected city
  useEffect(() => {
    if (formData.city) {
      const selectedCityObj = cities.find(
        (c) => c.name.toLowerCase() === formData.city.toLowerCase()
      );
      const cityLocalities = selectedCityObj?.localities || [];
      setLocalities(cityLocalities);
      
      // Only reset locality/pincode if current locality doesn't belong to newly selected city
      setFormData((prev: any) => {
        const belongs = cityLocalities.some((l: any) => l.name.toLowerCase() === prev.locality.toLowerCase());
        if (!belongs && prev.locality !== '') {
          return { ...prev, locality: '', pinCode: '' };
        }
        return prev;
      });
    } else {
      setLocalities([]);
      setFormData((prev: any) => ({ ...prev, locality: '', pinCode: '' }));
    }
  }, [formData.city, cities]);

  // Auto-fill PIN Code when locality is selected
  useEffect(() => {
    if (formData.locality && formData.city) {
      const selectedLocObj = localities.find(
        (l) => l.name.toLowerCase() === formData.locality.toLowerCase()
      );
      if (selectedLocObj?.pinCode && formData.pinCode !== selectedLocObj.pinCode) {
        setFormData((prev: any) => ({ ...prev, pinCode: selectedLocObj.pinCode }));
        showToast('PIN Code Verified', `Auto-filled code for ${formData.locality}: ${selectedLocObj.pinCode}`, 'success');
      }
    }
  }, [formData.locality, localities, showToast]);

  // Auto-select city and locality when a 6-digit PIN Code is typed
  useEffect(() => {
    if (formData.pinCode && formData.pinCode.length === 6) {
      let foundCity = '';
      let foundLocality = '';
      
      for (const city of cities) {
        const matchingLoc = city.localities?.find(
          (l: any) => l.pinCode === formData.pinCode
        );
        if (matchingLoc) {
          foundCity = city.name;
          foundLocality = matchingLoc.name;
          break;
        }
      }
      
      if (foundCity && foundLocality) {
        setFormData((prev: any) => ({
          ...prev,
          city: foundCity,
          locality: foundLocality,
        }));
        showToast('PIN Code Verified', `Located in ${foundCity} - ${foundLocality}`, 'success');
      } else {
        showToast('Validation Warning', 'This PIN Code was not found in our operated service areas.', 'warning');
      }
    }
  }, [formData.pinCode, cities, showToast]);

  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: val,
    }));
  };

  // Highlights handlers
  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...formData.keyHighlights];
    newHighlights[index] = value;
    setFormData((prev: any) => ({ ...prev, keyHighlights: newHighlights }));
  };

  const addHighlight = () => {
    setFormData((prev: any) => ({
      ...prev,
      keyHighlights: [...prev.keyHighlights, ''],
    }));
  };

  const removeHighlight = (index: number) => {
    const newHighlights = formData.keyHighlights.filter((_: any, i: number) => i !== index);
    setFormData((prev: any) => ({ ...prev, keyHighlights: newHighlights }));
  };

  // Amenities toggle handler
  const handleAmenityToggle = (amenityId: string) => {
    setFormData((prev: any) => {
      const selected = [...prev.selectedAmenities];
      const index = selected.indexOf(amenityId);
      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(amenityId);
      }
      return { ...prev, selectedAmenities: selected };
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newPhotos = files.reduce((acc: any[], file) => {
      const validation = validateImage(file);
      if (!validation.valid) {
        showToast('Invalid image', `${file.name}: ${validation.error}`, 'error');
        return acc;
      }

      acc.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        file,
        progress: 0,
        completed: true,
        uploaded: false,
      });

      return acc;
    }, []);

    setSelectedPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newDocs = files.reduce((acc: any[], file) => {
      const validation = validateDocument(file);
      if (!validation.valid) {
        showToast('Invalid document', `${file.name}: ${validation.error}`, 'error');
        return acc;
      }

      acc.push({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        file,
        progress: 0,
        completed: true,
        uploaded: false,
      });

      return acc;
    }, []);

    setSelectedDocs((prev) => [...prev, ...newDocs]);
  };

  const uploadListingMedia = async (listingId: string) => {
    const supabase = createClient();

    const images = [];
    for (let index = 0; index < selectedPhotos.length; index++) {
      const photo = selectedPhotos[index];
      const fileName = generateFileName(photo.name);
      const path = getListingImagePath(listingId, fileName);

      setSelectedPhotos((prev) =>
        prev.map((item) => (item.id === photo.id ? { ...item, progress: 25 } : item))
      );

      const { error } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(path, photo.file, {
          contentType: photo.file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(path);

      setSelectedPhotos((prev) =>
        prev.map((item) =>
          item.id === photo.id ? { ...item, progress: 100, uploaded: true } : item
        )
      );

      images.push({
        imageUrl: data.publicUrl,
        imageType: 'photo',
        displayOrder: index,
        isPrimary: index === 0,
      });
    }

    const documents = [];
    for (const doc of selectedDocs) {
      const fileName = generateFileName(doc.name);
      const path = getListingDocPath(listingId, fileName);

      setSelectedDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, progress: 25 } : item))
      );

      const { error } = await supabase.storage
        .from(LISTING_DOCUMENTS_BUCKET)
        .upload(path, doc.file, {
          contentType: doc.file.type,
          upsert: false,
        });

      if (error) throw error;

      setSelectedDocs((prev) =>
        prev.map((item) =>
          item.id === doc.id ? { ...item, progress: 100, uploaded: true } : item
        )
      );

      documents.push({
        docType: 'OTHER',
        docName: doc.name,
        docUrl: path,
      });
    }

    if (images.length || documents.length) {
      const mediaResponse = await fetch(`/api/listings/${listingId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, documents }),
      });

      if (!mediaResponse.ok) {
        const data = await mediaResponse.json();
        throw new Error(data.message || 'Failed to save listing media');
      }
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Not Supported', 'Geolocation is not supported by your browser', 'warning');
      return;
    }

    setDetectingLocation(true);
    showToast('Detecting Location', 'Requesting GPS coordinates...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (!res.ok) throw new Error('Failed to resolve coordinates');
          const data = await res.json();
          
          const address = data.address || {};
          const rawCity = address.city || address.town || address.village || address.state_district || '';
          const rawPostcode = address.postcode || '';
          
          let resolvedCity = '';
          let normalizedRaw = rawCity.toLowerCase();
          
          if (normalizedRaw.includes('bangalore') || normalizedRaw.includes('bengaluru')) {
            resolvedCity = 'Bangalore';
          } else if (normalizedRaw.includes('mumbai') || normalizedRaw.includes('bombay')) {
            resolvedCity = 'Mumbai';
          } else if (normalizedRaw.includes('delhi') || normalizedRaw.includes('noida') || normalizedRaw.includes('gurgaon') || normalizedRaw.includes('gurugram')) {
            resolvedCity = 'Delhi NCR';
          } else if (normalizedRaw.includes('pune') || normalizedRaw.includes('poona')) {
            resolvedCity = 'Pune';
          }

          if (resolvedCity) {
            const cityObj = cities.find(c => c.name === resolvedCity);
            let resolvedLocality = '';
            
            if (cityObj) {
              const cleanPostcode = rawPostcode.replace(/\s/g, '');
              const locByPost = cityObj.localities?.find((l: any) => l.pinCode === cleanPostcode);
              if (locByPost) {
                resolvedLocality = locByPost.name;
              } else {
                const rawSub = (address.suburb || address.neighbourhood || address.residential || '').toLowerCase();
                if (rawSub) {
                  const locByName = cityObj.localities?.find((l: any) => rawSub.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(rawSub));
                  if (locByName) resolvedLocality = locByName.name;
                }
              }
            }

            setFormData((prev: any) => ({
              ...prev,
              city: resolvedCity,
              locality: resolvedLocality || prev.locality,
              pinCode: rawPostcode.replace(/\s/g, '').substring(0, 6) || prev.pinCode,
            }));
            
            showToast(
              'Location Detected',
              `Auto-selected ${resolvedCity} ${resolvedLocality ? ` - ${resolvedLocality}` : ''}`,
              'success'
            );
          } else {
            showToast(
              'Location Unsupported',
              `Detected location is ${rawCity || 'unknown'}, which is outside operational cities.`,
              'warning'
            );
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          showToast('Detection Failed', 'Failed to resolve location details. Please select manually.', 'error');
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        showToast('Access Denied', 'Please enable location permissions in your browser.', 'warning');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Form submission handler
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amenities: formData.selectedAmenities,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.listing?.id && (selectedPhotos.length > 0 || selectedDocs.length > 0)) {
          await uploadListingMedia(data.listing.id);
        }

        showToast('Success', 'Listing submitted successfully for moderation', 'success');
        router.push('/dashboard/listings');
      } else {
        showToast('Error', data.message || 'Failed to submit listing', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Error', 'Something went wrong. Please check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    // Basic validation per step
    if (step === 1) {
      if (!formData.title.trim()) {
        showToast('Required', 'Please enter a title for your listing', 'warning');
        return;
      }
    }
    if (step === 2) {
      if (!formData.city || !formData.locality || !formData.pinCode || !formData.fullAddress) {
        showToast('Required', 'Please fill in all location details', 'warning');
        return;
      }
    }
    if (step === 3) {
      if (!formData.askingPrice) {
        showToast('Required', 'Please enter asking price', 'warning');
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => setStep((prev) => prev - 1);

  // Grouped Amenities display helper
  const categories = Array.from(new Set(amenities.map((a) => a.category)));

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Post a New Property</h1>
        <p className={styles.subtitle}>Complete the steps to list your property. It will go live after admin approval.</p>
      </div>

      {/* Steps Progress Indicator */}
      <div className={styles.stepsBar}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`${styles.stepNode} ${step >= s ? styles.stepNodeActive : ''}`}>
            <span className={styles.stepNum}>{s}</span>
            <span className={styles.stepName}>
              {s === 1 && 'Basic'}
              {s === 2 && 'Location'}
              {s === 3 && 'Details'}
              {s === 4 && 'Amenities'}
              {s === 5 && 'Media'}
            </span>
          </div>
        ))}
      </div>

      {/* Steps Panels */}
      <Card padding="lg">
        {step === 1 && (
          /* STEP 1: Basic Info */
          <div className={styles.stepContainer}>
            <div className={styles.sectionHeading}>
              <Building size={20} />
              <span>Step 1: Property Type & Title</span>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Listing For</label>
                <select 
                  name="listingFor" 
                  value={formData.listingFor} 
                  onChange={handleInputChange} 
                  className={styles.select}
                >
                  <option value="SALE">Sell Property</option>
                  <option value="RENT">Rent Out Property</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Property Category</label>
                <select 
                  name="propertyType" 
                  value={formData.propertyType} 
                  onChange={handleInputChange} 
                  className={styles.select}
                >
                  <option value="APARTMENT">Apartment / Flat</option>
                  <option value="HOUSE">Independent House</option>
                  <option value="VILLA">Villa</option>
                  <option value="PLOT">Plot / Land</option>
                  <option value="OFFICE">Commercial Office</option>
                  <option value="SHOP">Shop / Retail Store</option>
                  <option value="PG">PG / Hostel</option>
                </select>
              </div>
            </div>

            <Input
              label="Listing Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Spacious 3 BHK Apartment in Indiranagar for Sale"
              required
              fullWidth
            />
          </div>
        )}

        {step === 2 && (
          /* STEP 2: Location */
          <div className={styles.stepContainer}>
            <div className={styles.sectionHeading}>
              <MapPin size={20} />
              <span>Step 2: Location Details</span>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>City</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    name="city" 
                    value={formData.city} 
                    onChange={handleInputChange} 
                    className={styles.select}
                    style={{ flex: 1 }}
                    required
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Detect Current Location via GPS"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: detectingLocation ? 'not-allowed' : 'pointer',
                      color: 'var(--color-primary)',
                      transition: 'all var(--transition-fast)',
                      opacity: detectingLocation ? 0.6 : 1,
                      flexShrink: 0
                    }}
                  >
                    <Locate size={18} className={detectingLocation ? styles.spinAnimation : ''} />
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Locality</label>
                <select 
                  name="locality" 
                  value={formData.locality} 
                  onChange={handleInputChange} 
                  className={styles.select}
                  disabled={!formData.city}
                  required
                >
                  <option value="">Select Locality</option>
                  {localities.map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Pin Code"
                name="pinCode"
                value={formData.pinCode}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="560038"
                maxLength={6}
                required
                fullWidth
              />

              <Input
                label="Landmark (Optional)"
                name="landmark"
                value={formData.landmark}
                onChange={handleInputChange}
                placeholder="Near Metro Station"
                fullWidth
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Full Address (Private — Visible only to Admin)</label>
              <textarea
                name="fullAddress"
                value={formData.fullAddress}
                onChange={handleInputChange}
                className={styles.textarea}
                placeholder="Flat No, Wing, Building Name, Street Address, etc."
                rows={3}
                required
              />
            </div>
          </div>
        )}

        {step === 3 && (
          /* STEP 3: Specifications and Price */
          <div className={styles.stepContainer}>
            <div className={styles.sectionHeading}>
              <IndianRupee size={20} />
              <span>Step 3: Specifications & Pricing</span>
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Asking Price (INR)"
                name="askingPrice"
                value={formData.askingPrice}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, askingPrice: e.target.value.replace(/\D/g, '') }))}
                placeholder="7500000"
                required
                fullWidth
              />
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Price Negotiable</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '44px' }}>
                  <input
                    type="checkbox"
                    name="priceNegotiable"
                    checked={formData.priceNegotiable}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, priceNegotiable: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '0.937rem' }}>Negotiable price</span>
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Carpet Area (sqft)"
                name="carpetArea"
                value={formData.carpetArea}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, carpetArea: e.target.value.replace(/\D/g, '') }))}
                placeholder="1200"
                fullWidth
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>Furnishing</label>
                <select 
                  name="furnishing" 
                  value={formData.furnishing} 
                  onChange={handleInputChange} 
                  className={styles.select}
                >
                  <option value="FURNISHED">Fully Furnished</option>
                  <option value="SEMI_FURNISHED">Semi Furnished</option>
                  <option value="UNFURNISHED">Unfurnished</option>
                </select>
              </div>
            </div>

            {formData.propertyType !== 'PLOT' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Bedrooms (BHK)</label>
                  <select name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} className={styles.select}>
                    <option value="">Select Bedrooms</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bathrooms</label>
                  <select name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} className={styles.select}>
                    <option value="">Select Bathrooms</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          /* STEP 4: Amenities and Description */
          <div className={styles.stepContainer}>
            <div className={styles.sectionHeading}>
              <CheckSquare size={20} />
              <span>Step 4: Amenities & Descriptions</span>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Property Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={styles.textarea}
                placeholder="Describe your property highlights (locality, transport, interior, ventilation etc.)."
                rows={4}
              />
            </div>

            {/* Dynamic Highlights */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Key Highlights (Points)</label>
              {formData.keyHighlights.map((hl: string, index: number) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Input
                    value={hl}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    placeholder="e.g. 5 minutes walk from Metro station"
                    fullWidth
                  />
                  {formData.keyHighlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHighlight(index)}
                      style={{ color: 'var(--color-error)', cursor: 'pointer', padding: '0 0.5rem' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addHighlight}
                leftIcon={<Plus size={16} />}
              >
                Add Highlight Point
              </Button>
            </div>

            {/* Grouped Amenities selection */}
            <div className={styles.formGroup}>
              <label className={styles.label} style={{ marginBottom: '1rem' }}>Select Available Amenities</label>
              {categories.map((cat) => (
                <div key={cat} style={{ marginBottom: '1.5rem' }}>
                  <h4 className={styles.categoryTitle}>{cat}</h4>
                  <div className={styles.amenitiesGrid}>
                    {amenities
                      .filter((a) => a.category === cat)
                      .map((amenity) => {
                        const checked = formData.selectedAmenities.includes(amenity.id);
                        return (
                          <label key={amenity.id} className={`${styles.amenityChip} ${checked ? styles.amenityChipActive : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleAmenityToggle(amenity.id)}
                              style={{ display: 'none' }}
                            />
                            <span>{amenity.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          /* STEP 5: Media and Document Uploads */
          <div className={styles.stepContainer}>
            <div className={styles.sectionHeading}>
              <Upload size={20} />
              <span>Step 5: Media & Documents</span>
            </div>

            {/* Photos upload section */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Photos (Max 5MB per image)</label>
              <div className={styles.dropzone}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className={styles.fileInput}
                  id="photos-upload"
                />
                <label htmlFor="photos-upload" className={styles.dropzoneLabel}>
                  <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                  <span>Drag & drop files or click to upload</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>PNG, JPG, WEBP formats</span>
                </label>
              </div>

              {selectedPhotos.length > 0 && (
                <div className={styles.fileList}>
                  {selectedPhotos.map((photo) => (
                    <div key={photo.id} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <FileText size={16} />
                        <span className={styles.fileName}>{photo.name}</span>
                      </div>
                      <div className={styles.fileProgress}>
                        {loading && !photo.uploaded ? (
                          <div className={styles.progressBar} style={{ width: `${photo.progress}%` }} />
                        ) : (
                          <span className={styles.successText}><Check size={14} /> {photo.uploaded ? 'Uploaded' : 'Ready'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document upload section */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Ownership Documents (Optional — Private)</label>
              <div className={styles.dropzone}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleDocSelect}
                  className={styles.fileInput}
                  id="docs-upload"
                />
                <label htmlFor="docs-upload" className={styles.dropzoneLabel}>
                  <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                  <span>Upload Sale Deed, Tax Receipts, or RERA Certificate</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>PDF, PNG, JPG formats</span>
                </label>
              </div>

              {selectedDocs.length > 0 && (
                <div className={styles.fileList}>
                  {selectedDocs.map((doc) => (
                    <div key={doc.id} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <FileText size={16} />
                        <span className={styles.fileName}>{doc.name}</span>
                      </div>
                      <div className={styles.fileProgress}>
                        {loading && !doc.uploaded ? (
                          <div className={styles.progressBar} style={{ width: `${doc.progress}%` }} />
                        ) : (
                          <span className={styles.successText}><Check size={14} /> {doc.uploaded ? 'Uploaded' : 'Ready'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons Controls */}
        <div className={styles.buttonControls}>
          {step > 1 && (
            <Button type="button" variant="ghost" onClick={prevStep} leftIcon={<ArrowLeft size={16} />}>
              Previous
            </Button>
          )}

          {step < 5 ? (
            <Button type="button" variant="primary" onClick={nextStep} rightIcon={<ArrowRight size={16} />} style={{ marginLeft: 'auto' }}>
              Next Step
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleSubmit} 
              loading={loading} 
              disabled={selectedPhotos.length === 0 || selectedPhotos.some((p) => !p.completed)} 
              style={{ marginLeft: 'auto' }}
            >
              Submit Property
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
