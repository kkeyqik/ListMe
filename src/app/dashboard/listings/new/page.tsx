'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  Locate,
  ShieldAlert,
  X,
  Video
} from 'lucide-react';
import { useToast, Button, Input, Card, Select, LocalityAutocomplete, type Place } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { PhoneVerificationModal } from '@/components/auth/PhoneVerificationModal';
import {
  uploadListingFile,
  validateDocument,
  validateImage,
  validateVideo,
  processImage,
} from '@/lib/upload';
import { applyPlaceToListingForm } from '../locality-pick';
import styles from './new.module.css';

import { RESIDENTIAL_PROPERTY_CATEGORIES, COMMERCIAL_PROPERTY_CATEGORIES, PROPERTY_CATEGORY_VALUES, isLandType, DOCUMENT_TYPE_OPTIONS } from '../property-types';
import { PhotoThumb } from '../PhotoThumb';

const MAX_PHOTOS = 20;
const OPTIONAL_ATTRIBUTE_FIELDS = ['furnishing', 'facing', 'possession', 'ageOfProperty', 'ownership', 'parking', 'parkingCount', 'waterSupply', 'powerBackup'];

/**
 * Optional attribute selects default to "Not specified" (''), which is sent
 * as null so the listing does not claim invented values (east-facing, full
 * power backup, ...). Land has no furnishing.
 */
function optionalAttributes(formData: any) {
  const out: Record<string, string | null> = {};
  for (const key of OPTIONAL_ATTRIBUTE_FIELDS) {
    const value = formData[key];
    out[key] = value === undefined || value === null || value === '' ? null : String(value);
  }
  if (isLandType(formData.propertyType)) out.furnishing = null;
  return out;
}


// Local, non-persisted id for a picked file (module counter keeps render pure)
let localFileCounter = 0;
const nextLocalFileId = () => `file-${++localFileCounter}`;

export default function NewListing() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile, loading: authLoading, refreshProfile } = useAuth();
  // Must match the server rule in POST /api/listings, which requires a verified
  // phone for everyone (admins included); otherwise the final submit is refused.
  const isPhoneVerified = Boolean(profile?.phoneVerified);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  
  // Data lists from backend APIs
  const [cities, setCities] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Set once POST /api/listings succeeds, so a retry after a failed upload reuses it
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
    furnishing: '',
    facing: '',
    possession: '',
    ageOfProperty: '',
    ownership: '',
    parking: '',
    parkingCount: '',
    waterSupply: '',
    powerBackup: '',
    reraNumber: '',
    videoUrl: '',
    selectedAmenities: [], // array of ids
  });

  // Media States
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    id: string;
    name: string;
    size: number;
    file: File;
    progress: number;
    uploaded?: boolean;
    previewUrl?: string;
  } | null>(null);
  const [videoMode, setVideoMode] = useState<'upload' | 'link'>('upload');

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
        const validProps = PROPERTY_CATEGORY_VALUES;
        if (validProps.includes(upperProp)) {
          prefilledData.propertyType = upperProp;
        } else if (upperProp === 'HOUSE_VILLA' || upperProp === 'HOUSE/VILLA') {
          prefilledData.propertyType = 'HOUSE';
        }
      }

      const queryIsPg = params.get('isPg') === 'true' || queryPropType?.toUpperCase() === 'PG';
      const queryRoomType = params.get('roomType') || window.sessionStorage.getItem('onboarding_room_type');
      const queryPgSub = window.sessionStorage.getItem('onboarding_pg_subproperty');

      if (queryIsPg) {
        prefilledData.propertyType = 'PG';
        prefilledData.listingFor = 'RENT';
        if (queryRoomType) {
          const roomLabel = queryRoomType.charAt(0).toUpperCase() + queryRoomType.slice(1);
          const subLabel = queryPgSub ? ` in ${queryPgSub}` : '';
          prefilledData.title = `${roomLabel} Room${subLabel} PG / Co-Living Space`;
        }
      }

      const queryCategory = window.sessionStorage.getItem('onboarding_category');
      const queryCommSub = window.sessionStorage.getItem('onboarding_commercial_subproperty');

      if (queryCategory === 'commercial' && queryCommSub && !queryIsPg && !prefilledData.title && !formData.title) {
        const forText = (prefilledData.listingFor || formData.listingFor) === 'RENT' ? 'Rent / Lease' : 'Sale';
        prefilledData.title = `Commercial ${queryCommSub} for ${forText}`;
      }

      // Cleanup consumed onboarding keys to avoid leaking state into future sessions
      window.sessionStorage.removeItem('onboarding_is_pg');
      window.sessionStorage.removeItem('onboarding_room_type');
      window.sessionStorage.removeItem('onboarding_pg_subproperty');
      window.sessionStorage.removeItem('onboarding_category');
      window.sessionStorage.removeItem('onboarding_commercial_subproperty');
      
      if (Object.keys(prefilledData).length > 0) {
        setFormData((prev: any) => ({
          ...prev,
          ...prefilledData
        }));
      }
    }
  }, []);

  // Track last resolved pin code to avoid duplicate fetches and loops
  const lastResolvedPinRef = useRef<string>('');
  const prevCityRef = useRef(formData.city);

  // Update localities based on selected city without wiping custom locality
  useEffect(() => {
    if (formData.city) {
      // Only reset locality/pincode if city was manually changed to a different city
      if (prevCityRef.current && prevCityRef.current.toLowerCase() !== formData.city.toLowerCase()) {
        const selectedCityObj = cities.find(
          (c) => c.name.toLowerCase() === formData.city.toLowerCase()
        );
        const cityLocalities = selectedCityObj?.localities || [];
        setLocalities(cityLocalities);
        setFormData((prev: any) => ({ ...prev, locality: '', pinCode: '' }));
        lastResolvedPinRef.current = '';
      } else if (localities.length === 0) {
        const selectedCityObj = cities.find(
          (c) => c.name.toLowerCase() === formData.city.toLowerCase()
        );
        if (selectedCityObj?.localities?.length) {
          setLocalities(selectedCityObj.localities);
        }
      }
      prevCityRef.current = formData.city;
    } else {
      setLocalities([]);
      setFormData((prev: any) => ({ ...prev, locality: '', pinCode: '' }));
      prevCityRef.current = '';
      lastResolvedPinRef.current = '';
    }
  }, [formData.city, cities]);

  // Auto-fill PIN Code when locality is selected from pre-seeded list
  useEffect(() => {
    if (formData.locality && formData.city && localities.length > 0) {
      const selectedLocObj = localities.find(
        (l) => typeof l !== 'string' && l.name?.toLowerCase() === formData.locality.toLowerCase()
      );
      if (selectedLocObj?.pinCode && formData.pinCode !== selectedLocObj.pinCode) {
        setFormData((prev: any) => ({ ...prev, pinCode: selectedLocObj.pinCode }));
        showToast('PIN Code Verified', `Auto-filled code for ${formData.locality}: ${selectedLocObj.pinCode}`, 'success');
      }
    }
  }, [formData.locality, localities, formData.city, showToast]);

  // Live India Post API: Auto-resolve City, State & clean Localities when 6-digit PIN Code is typed
  useEffect(() => {
    const cleanPin = (formData.pinCode || '').replace(/\D/g, '');
    if (cleanPin.length === 6 && cleanPin !== lastResolvedPinRef.current) {
      let isMounted = true;

      const fetchPincodeDetails = async () => {
        try {
          const res = await fetch(`/api/locations/pincode/${cleanPin}`);
          if (!isMounted) return;

          if (res.ok) {
            const data = await res.json();
            if (data.success && isMounted) {
              lastResolvedPinRef.current = cleanPin;
              const resolvedCity = data.city || '';
              const resolvedLocalities: string[] = data.localities || [];

              // Dynamically ensure city exists in cities dropdown
              if (resolvedCity) {
                setCities((prev) => {
                  if (!prev.some((c) => c.name.toLowerCase() === resolvedCity.toLowerCase())) {
                    return [...prev, { id: `auto-${resolvedCity}`, name: resolvedCity, localities: [] }];
                  }
                  return prev;
                });
              }

              // Update localities list with clean, sanitized names
              const cleanLocObjects = resolvedLocalities.map((loc) => ({
                id: loc,
                name: loc,
                pinCode: cleanPin,
              }));
              setLocalities(cleanLocObjects);

              // Auto-fill city and locality
              prevCityRef.current = resolvedCity;
              setFormData((prev: any) => ({
                ...prev,
                city: resolvedCity || prev.city,
                locality: resolvedLocalities.length === 1 ? resolvedLocalities[0] : prev.locality,
              }));

              showToast(
                'PIN Code Verified',
                `Located in ${resolvedCity}${data.state ? `, ${data.state}` : ''}`,
                'success'
              );
              return;
            }
          }
        } catch (err) {
          console.error('Error fetching PIN code location:', err);
        }

        // Local fallback if API fails
        if (isMounted) {
          let foundCity = '';
          let foundLocality = '';
          for (const city of cities) {
            const matchingLoc = city.localities?.find((l: any) => l.pinCode === cleanPin);
            if (matchingLoc) {
              foundCity = city.name;
              foundLocality = matchingLoc.name;
              break;
            }
          }

          if (foundCity) {
            lastResolvedPinRef.current = cleanPin;
            prevCityRef.current = foundCity;
            setFormData((prev: any) => ({
              ...prev,
              city: foundCity,
              locality: foundLocality || prev.locality,
            }));
            showToast('PIN Code Verified', `Located in ${foundCity}`, 'success');
          }
        }
      };

      fetchPincodeDetails();
      return () => {
        isMounted = false;
      };
    }
  }, [formData.pinCode, cities, showToast]);

  // Locality autocomplete: typing keeps free text; coordinates from an earlier pick no longer apply.
  const handleLocalityTextChange = (val: string) => {
    setFormData((prev: any) => ({
      ...prev,
      locality: val,
      ...(prev.latitude != null ? { latitude: null, longitude: null } : {}),
    }));
  };

  // A picked suggestion fills locality, sub-locality, city, PIN and coordinates.
  const handleLocalityPick = (place: Place) => {
    const { patch, changes, city, pinCode } = applyPlaceToListingForm(formData, place);
    if (city) {
      // Mark the city as already handled so the city effect does not wipe locality/PIN,
      // and make sure the dropdown can show a city that is not in the list yet.
      prevCityRef.current = city;
      setCities((prev) =>
        prev.some((c) => c.name?.toLowerCase() === city.toLowerCase())
          ? prev
          : [...prev, { id: `auto-${city}`, name: city, localities: [] }]
      );
    }
    // The picked place already gave the city: do not let the India Post lookup override it.
    if (pinCode) lastResolvedPinRef.current = pinCode;
    setFormData((prev: any) => ({ ...prev, ...patch }));
    if (changes.length > 0) {
      showToast('Location updated', changes.join(' · '), 'success');
    }
  };

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

  const addPhotoFiles = (incoming: File[]) => {
    const room = MAX_PHOTOS - selectedPhotos.length;
    if (room <= 0) {
      showToast('Photo limit reached', `A listing can have up to ${MAX_PHOTOS} photos.`, 'warning');
      return;
    }
    if (incoming.length > room) {
      showToast('Photo limit reached', `Only the first ${room} photo(s) were added (max ${MAX_PHOTOS}).`, 'warning');
    }
    const files = incoming.slice(0, room);

    const newPhotos = files.reduce((acc: any[], file) => {
      const validation = validateImage(file);
      if (!validation.valid) {
        showToast('Invalid image', `${file.name}: ${validation.error}`, 'error');
        return acc;
      }

      acc.push({
        id: nextLocalFileId(),
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addPhotoFiles(Array.from(e.target.files));
    // Reset so picking the same file again (after removing it) fires onChange
    e.target.value = '';
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addDocFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  // Drag & drop onto a dropzone: stop the browser from opening the file (which
  // would navigate away and wipe the wizard) and reuse the picker handlers.
  const dropHandlers = (onFiles: (files: File[]) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (loading) return;
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) onFiles(files);
    },
  });

  const addDocFiles = (files: File[]) => {
    const newDocs = files.reduce((acc: any[], file) => {
      const validation = validateDocument(file);
      if (!validation.valid) {
        showToast('Invalid document', `${file.name}: ${validation.error}`, 'error');
        return acc;
      }

      acc.push({
        id: nextLocalFileId(),
        name: file.name,
        file,
        docType: 'OTHER',
        progress: 0,
        completed: true,
        uploaded: false,
      });

      return acc;
    }, []);

    setSelectedDocs((prev) => [...prev, ...newDocs]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDoc = (index: number) => {
    setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = '';
    selectVideoFile(file);
  };

  const dropVideoFiles = (files: File[]) => selectVideoFile(files[0]);

  const selectVideoFile = (file: File) => {
    const validation = validateVideo(file);
    if (!validation.valid) {
      showToast('Invalid Video', validation.error || 'Please select a valid video file', 'error');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedVideo({
      id: nextLocalFileId(),
      name: file.name,
      size: file.size,
      file,
      progress: 0,
      uploaded: false,
      previewUrl,
    });
    setFormData((prev: any) => ({ ...prev, videoUrl: '' }));
  };

  const removeVideo = () => {
    if (selectedVideo?.previewUrl) {
      URL.revokeObjectURL(selectedVideo.previewUrl);
    }
    setSelectedVideo(null);
  };

  // S14: Revoke object URL on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (selectedVideo?.previewUrl) {
        URL.revokeObjectURL(selectedVideo.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadListingMedia = async (listingId: string, videoUrlToSave = '') => {
    const images = [];
    for (let index = 0; index < selectedPhotos.length; index++) {
      const photo = selectedPhotos[index];
      
      // Process, compress, and strip EXIF from image
      const processedFile = await processImage(photo.file);
      setSelectedPhotos((prev) =>
        prev.map((item) => (item.id === photo.id ? { ...item, progress: 25 } : item))
      );

      const { publicUrl } = await uploadListingFile(listingId, 'images', processedFile);

      setSelectedPhotos((prev) =>
        prev.map((item) =>
          item.id === photo.id ? { ...item, progress: 100, uploaded: true } : item
        )
      );

      // Order and cover are set by the server (first photo becomes the cover)
      images.push({
        imageUrl: publicUrl,
        imageType: 'photo',
      });
    }

    const documents = [];
    for (const doc of selectedDocs) {
      setSelectedDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, progress: 25 } : item))
      );

      const { path } = await uploadListingFile(listingId, 'documents', doc.file);

      setSelectedDocs((prev) =>
        prev.map((item) =>
          item.id === doc.id ? { ...item, progress: 100, uploaded: true } : item
        )
      );

      documents.push({
        docType: doc.docType || 'OTHER',
        docName: doc.name,
        docUrl: path,
      });
    }

    let finalVideoUrl = '';

    // Upload video file if user selected a direct video file
    if (selectedVideo) {
      setSelectedVideo((prev) => (prev ? { ...prev, progress: 30 } : null));

      try {
        const { publicUrl } = await uploadListingFile(
          listingId,
          'videos',
          selectedVideo.file,
          selectedVideo.file.type || 'video/mp4'
        );
        finalVideoUrl = publicUrl;
      } catch (err) {
        console.error('Video upload error:', err);
        throw new Error(`Failed to upload video: ${err instanceof Error ? err.message : 'unknown error'}`);
      }

      setSelectedVideo((prev) => (prev ? { ...prev, progress: 100, uploaded: true } : null));
    } else if (videoUrlToSave?.trim()) {
      finalVideoUrl = videoUrlToSave.trim();
    }

    const videos = finalVideoUrl
      ? [{ videoUrl: finalVideoUrl, videoType: 'walkthrough' }]
      : [];

    if (images.length || documents.length || videos.length) {
      const mediaResponse = await fetch(`/api/listings/${listingId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, documents, videos, replaceVideos: true }),
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
          const rawCity = address.city || address.town || address.village || address.state_district || address.county || '';
          const rawPostcode = address.postcode || '';
          const rawSub = address.suburb || address.neighbourhood || address.residential || address.subdistrict || address.road || '';
          
          const normalizedCity = rawCity.toLowerCase().trim();
          const normalizedSub = rawSub.toLowerCase().trim();
          const combinedLoc = `${rawCity} ${rawSub} ${address.county || ''} ${address.state_district || ''} ${address.state || ''}`.toLowerCase();
          
          let resolvedCity = '';

          // 1. Direct match with operational cities loaded from database
          const directMatch = cities.find(c => {
            const cName = c.name.toLowerCase();
            return cName === normalizedCity || 
                   normalizedCity.includes(cName) || 
                   cName.includes(normalizedCity) ||
                   combinedLoc.includes(cName);
          });

          if (directMatch) {
            resolvedCity = directMatch.name;
          } else if (
            combinedLoc.includes('delhi') ||
            combinedLoc.includes('noida') ||
            combinedLoc.includes('gurgaon') ||
            combinedLoc.includes('gurugram') ||
            combinedLoc.includes('faridabad') ||
            combinedLoc.includes('ghaziabad')
          ) {
            // If in NCR, check if specific NCR town exists in cities list first
            const ncrCity = cities.find(c => combinedLoc.includes(c.name.toLowerCase()));
            resolvedCity = ncrCity ? ncrCity.name : 'Delhi NCR';
          } else if (combinedLoc.includes('bangalore') || combinedLoc.includes('bengaluru')) {
            resolvedCity = 'Bangalore';
          } else if (combinedLoc.includes('mumbai') || combinedLoc.includes('bombay') || combinedLoc.includes('thane') || combinedLoc.includes('navi mumbai')) {
            const mumbaiCity = cities.find(c => combinedLoc.includes(c.name.toLowerCase()));
            resolvedCity = mumbaiCity ? mumbaiCity.name : 'Mumbai';
          } else if (combinedLoc.includes('pune') || combinedLoc.includes('poona')) {
            resolvedCity = 'Pune';
          } else if (combinedLoc.includes('hyderabad') || combinedLoc.includes('secunderabad')) {
            resolvedCity = 'Hyderabad';
          }

          const finalCity = resolvedCity || rawCity || '';
          if (finalCity) {
            // Dynamically add detected city to cities dropdown if not present
            setCities((prev) => {
              if (!prev.some((c) => c.name.toLowerCase() === finalCity.toLowerCase())) {
                return [...prev, { id: `auto-${finalCity}`, name: finalCity, localities: [] }];
              }
              return prev;
            });

            const cleanPostcode = rawPostcode.replace(/\D/g, '').substring(0, 6);
            prevCityRef.current = finalCity;

            setFormData((prev: any) => ({
              ...prev,
              city: finalCity,
              locality: rawSub || prev.locality,
              pinCode: cleanPostcode || prev.pinCode,
            }));

            showToast(
              'Location Detected',
              `Auto-selected ${finalCity}${rawSub ? ` - ${rawSub}` : ''}`,
              'success'
            );
          } else {
            showToast(
              'Location Unsupported',
              'Could not determine city from GPS coordinates. Please select manually.',
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
  // Warn before leaving with unsaved input (refresh, closing the tab, or a
  // file dropped outside a dropzone opening in the tab).
  const isDirty =
    !submitted &&
    (Boolean(formData.title || formData.description || formData.locality || formData.pinCode ||
      formData.fullAddress || formData.askingPrice) ||
      selectedPhotos.length > 0 ||
      selectedDocs.length > 0 ||
      Boolean(selectedVideo));
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSubmit = async () => {
    let normalizedVideo = formData.videoUrl?.trim() || '';
    if (normalizedVideo && !/^[a-zA-Z]+:\/\//.test(normalizedVideo)) {
      if (
        normalizedVideo.startsWith('youtube.com') ||
        normalizedVideo.startsWith('youtu.be') ||
        normalizedVideo.startsWith('vimeo.com') ||
        normalizedVideo.startsWith('www.')
      ) {
        normalizedVideo = `https://${normalizedVideo}`;
      }
    }

    if (normalizedVideo) {
      try {
        const parsed = new URL(normalizedVideo);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          showToast('Invalid Video URL', 'Video URL must use http or https protocol', 'warning');
          return;
        }
      } catch {
        showToast('Invalid Video URL', 'Please enter a valid video link (e.g. YouTube or Vimeo)', 'warning');
        return;
      }
    }

    setLoading(true);
    try {
      // If an earlier attempt already created the listing but a media upload
      // failed, retry only the uploads instead of creating a duplicate listing.
      let listingId = createdListingId;
      if (!listingId) {
        const response = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            ...optionalAttributes(formData),
            // Don't save blank highlight bullets
            keyHighlights: (formData.keyHighlights || [])
              .map((h: unknown) => String(h ?? '').trim())
              .filter(Boolean),
            videoUrl: normalizedVideo,
            amenities: formData.selectedAmenities,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast('Error', data.message || 'Failed to submit listing', 'error');
          return;
        }
        listingId = data.listing?.id || null;
        if (listingId) setCreatedListingId(listingId);
      }

      if (listingId && (selectedPhotos.length > 0 || selectedDocs.length > 0 || normalizedVideo || Boolean(selectedVideo))) {
        try {
          await uploadListingMedia(listingId, normalizedVideo);
        } catch (uploadErr) {
          console.error('Media upload error:', uploadErr);
          showToast(
            'Upload failed',
            `Your listing was saved, but its media could not be uploaded (${
              uploadErr instanceof Error ? uploadErr.message : 'unknown error'
            }). Press Submit again to retry the upload.`,
            'error'
          );
          return;
        }
      }

      showToast('Success', 'Listing submitted successfully for moderation', 'success');
      setSubmitted(true);
      router.push('/dashboard/listings');
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
      if (!isPhoneVerified) {
        showToast(
          'Phone Verification Required',
          'Please verify your mobile phone number before proceeding to Step 2.',
          'warning'
        );
        setVerifyModalOpen(true);
        return;
      }
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
      const cleanPin = (formData.pinCode || '').replace(/\D/g, '');
      if (!/^[1-9]\d{5}$/.test(cleanPin)) {
        showToast('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code (cannot start with 0)', 'warning');
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
            {!authLoading && profile && !isPhoneVerified && (
              <div className={styles.warningBanner}>
                <ShieldAlert size={24} className={styles.warningIcon} />
                <div className={styles.warningContent}>
                  <h4 className={styles.warningTitle}>Phone Verification Required</h4>
                  <p className={styles.warningText}>
                    To prevent spam and ensure real, verified property owners on ListMe, your mobile phone number must be verified before you can list a property.
                  </p>
                  <div className={styles.warningActions}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setVerifyModalOpen(true)}
                      style={{ padding: '0.4rem 0.85rem' }}
                    >
                      Verify Phone via OTP &rarr;
                    </Button>
                    <Link href="/dashboard/profile" className={styles.verifyLink}>
                      Or edit in Profile
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.sectionHeading}>
              <Building size={20} />
              <span>Step 1: Property Type & Title</span>
            </div>

            <p
              role="note"
              style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--color-text-secondary)', background: 'var(--color-neutral-50, #f8fafc)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.625rem 0.875rem', margin: 0 }}
            >
              <strong>Who sees your details:</strong> your name is shown on the listing. Once it is approved,
              your phone number (and email, if you added one) is shared with any phone-verified seeker who taps
              &ldquo;I&apos;m Interested&rdquo;, so they can contact you directly. Your exact address stays private.
            </p>

            <div className={styles.formGrid}>
              <Select
                label="Listing For"
                name="listingFor"
                value={formData.listingFor}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="SALE">Sell Property</option>
                <option value="RENT">Rent Out Property</option>
              </Select>

              <Select
                label="Property Category"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                fullWidth
              >
                <optgroup label="Residential">
                  {RESIDENTIAL_PROPERTY_CATEGORIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Commercial">
                  {COMMERCIAL_PROPERTY_CATEGORIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              </Select>
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Select City"
                      required
                      fullWidth
                    >
                      {cities.map((city) => (
                        <option key={city.id || city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Detect Current Location via GPS"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-neutral-300)',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: detectingLocation ? 'not-allowed' : 'pointer',
                      color: 'var(--color-primary)',
                      transition: 'all var(--transition-fast)',
                      opacity: detectingLocation ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Locate size={18} className={detectingLocation ? styles.spinAnimation : ''} />
                  </button>
                </div>
              </div>

              <LocalityAutocomplete
                label="Locality"
                subLabel="(area, sector, society or PIN)"
                name="locality"
                value={formData.locality}
                onChange={handleLocalityTextChange}
                onSelect={handleLocalityPick}
                city={formData.city || undefined}
                presetOptions={localities.map((loc) => (typeof loc === 'string' ? loc : loc.name))}
                placeholder="Search locality, e.g. Indiranagar, Sector 62, Baner"
                required
                fullWidth
              />
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
              <label className={styles.label}>Full Address (Private — visible only to ListMe admins; seekers see just the locality and city)</label>
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

            {/* Pricing Section */}
            <div className={styles.formGrid}>
              <Input
                label={formData.listingFor === 'RENT' ? 'Monthly Rent (₹)' : 'Asking Price (₹)'}
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

            {/* Maintenance & Security Deposit */}
            <div className={styles.formGrid}>
              <Input
                label="Maintenance Charges (₹/month)"
                name="maintenanceCharges"
                value={formData.maintenanceCharges}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, maintenanceCharges: e.target.value.replace(/\D/g, '') }))}
                placeholder="3500"
                fullWidth
              />

              <Input
                label={formData.listingFor === 'RENT' ? 'Security Deposit (₹)' : 'Security Deposit (₹)'}
                name="securityDeposit"
                value={formData.securityDeposit}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, securityDeposit: e.target.value.replace(/\D/g, '') }))}
                placeholder={formData.listingFor === 'RENT' ? '50000' : 'Optional for sale'}
                fullWidth
              />
            </div>

            {/* Area Section */}
            <div className={styles.formGrid}>
              <Input
                label="Carpet Area (sqft)"
                name="carpetArea"
                value={formData.carpetArea}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, carpetArea: e.target.value.replace(/\D/g, '') }))}
                placeholder="1200"
                fullWidth
              />

              <Input
                label="Built-Up Area (sqft)"
                name="builtUpArea"
                value={formData.builtUpArea}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, builtUpArea: e.target.value.replace(/\D/g, '') }))}
                placeholder="1450"
                fullWidth
              />
            </div>

            {/* Rooms, Balconies & Furnishing */}
            {!isLandType(formData.propertyType) && (
              <>
                <div className={styles.formGrid}>
                  <Select
                    label="Bedrooms (BHK)"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    placeholder="Select Bedrooms"
                    fullWidth
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </Select>

                  <Select
                    label="Bathrooms"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    placeholder="Select Bathrooms"
                    fullWidth
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </Select>
                </div>

                <div className={styles.formGrid}>
                  <Select
                    label="Balconies"
                    name="balconies"
                    value={formData.balconies}
                    onChange={handleInputChange}
                    placeholder="Select Balconies"
                    fullWidth
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4+</option>
                  </Select>

                  <Select
                    label="Furnishing"
                    name="furnishing"
                    value={formData.furnishing}
                    onChange={handleInputChange}
                    fullWidth
                  >
                    <option value="">Not specified</option>
                    <option value="FURNISHED">Fully Furnished</option>
                    <option value="SEMI_FURNISHED">Semi Furnished</option>
                    <option value="UNFURNISHED">Unfurnished</option>
                  </Select>
                </div>
              </>
            )}

            {/* Facing & Possession */}
            <div className={styles.formGrid}>
              <Select
                label="Facing"
                name="facing"
                value={formData.facing}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="EAST">East</option>
                <option value="NORTH">North</option>
                <option value="WEST">West</option>
                <option value="SOUTH">South</option>
                <option value="NORTH_EAST">North-East</option>
                <option value="NORTH_WEST">North-West</option>
                <option value="SOUTH_EAST">South-East</option>
                <option value="SOUTH_WEST">South-West</option>
              </Select>

              <Select
                label="Possession"
                name="possession"
                value={formData.possession}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="READY">Ready to Move</option>
                <option value="UNDER_CONSTRUCTION">Under Construction</option>
              </Select>
            </div>

            {/* Age of Property & Ownership */}
            <div className={styles.formGrid}>
              <Select
                label="Age of Property"
                name="ageOfProperty"
                value={formData.ageOfProperty}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="0_1_YEARS">0-1 Years</option>
                <option value="1_5_YEARS">1-5 Years</option>
                <option value="5_10_YEARS">5-10 Years</option>
                <option value="10_PLUS_YEARS">10+ Years</option>
              </Select>

              <Select
                label="Ownership"
                name="ownership"
                value={formData.ownership}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="FREEHOLD">Freehold</option>
                <option value="LEASEHOLD">Leasehold</option>
                <option value="COOPERATIVE">Co-operative Society</option>
                <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
              </Select>
            </div>

            {/* Parking & Parking Count */}
            <div className={styles.formGrid}>
              <Select
                label="Parking"
                name="parking"
                value={formData.parking}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="NONE">None</option>
                <option value="COVERED">Covered</option>
                <option value="OPEN">Open</option>
                <option value="BOTH">Both</option>
              </Select>

              <Select
                label="Parking Count"
                name="parkingCount"
                value={formData.parkingCount}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3+</option>
              </Select>
            </div>

            {/* Water Supply & Power Backup */}
            <div className={styles.formGrid}>
              <Select
                label="Water Supply"
                name="waterSupply"
                value={formData.waterSupply}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="CORPORATION">Corporation / Municipal</option>
                <option value="BOREWELL">Borewell</option>
                <option value="CORP_WELL">Both Corporation & Borewell</option>
              </Select>

              <Select
                label="Power Backup"
                name="powerBackup"
                value={formData.powerBackup}
                onChange={handleInputChange}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="NONE">None</option>
                <option value="PARTIAL">Partial</option>
                <option value="FULL">Full 24x7</option>
              </Select>
            </div>

            {/* RERA Number */}
            <div className={styles.formGroup}>
              <Input
                label="RERA Registration Number (Optional)"
                name="reraNumber"
                value={formData.reraNumber}
                onChange={handleInputChange}
                placeholder="e.g. UPRERA123456 or PRM/KA/RERA/..."
                fullWidth
              />
            </div>
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
              <span>Step 5: Media & Documents (Optional)</span>
            </div>

            {/* Photos upload section */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Photos (Optional, Max 5MB per image, up to {MAX_PHOTOS} photos)</label>
              <div className={styles.dropzone} {...dropHandlers(addPhotoFiles)}>
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
                  <span>Drag & drop files or click to upload (Optional)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>PNG, JPG, WEBP formats</span>
                </label>
              </div>

              {selectedPhotos.length > 0 && (
                <div className={styles.fileList}>
                  {selectedPhotos.map((photo, index) => (
                    <div key={photo.id} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <PhotoThumb file={photo.file} name={photo.name} />
                        <span className={styles.fileName}>{photo.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={styles.fileProgress}>
                          {loading && !photo.uploaded ? (
                            <div className={styles.progressBar} style={{ width: `${photo.progress}%` }} />
                          ) : (
                            <span className={styles.successText}><Check size={14} /> {photo.uploaded ? 'Uploaded' : 'Ready'}</span>
                          )}
                        </div>
                        {!loading && (
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            aria-label="Remove photo"
                            title="Remove photo"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video walkthrough section */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <label className={styles.label} style={{ marginBottom: 0 }}>
                  <Video size={18} style={{ color: 'var(--color-secondary)' }} />
                  <span>Property Walkthrough Video (Optional)</span>
                </label>
                <div className={styles.videoModeToggle}>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoMode('upload');
                      // S7: Clear link-mode state when switching to upload
                      setFormData((prev: any) => ({ ...prev, videoUrl: '' }));
                    }}
                    className={`${styles.videoModeBtn} ${videoMode === 'upload' ? styles.videoModeBtnActive : ''}`}
                  >
                    <Upload size={14} />
                    <span>Upload Video File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoMode('link');
                      // S7: Clear upload-mode state when switching to link
                      removeVideo();
                    }}
                    className={`${styles.videoModeBtn} ${videoMode === 'link' ? styles.videoModeBtnActive : ''}`}
                  >
                    <Video size={14} />
                    <span>Paste Video Link</span>
                  </button>
                </div>
              </div>

              {videoMode === 'upload' ? (
                <>
                  {!selectedVideo ? (
                    <div className={styles.dropzone} {...dropHandlers(dropVideoFiles)}>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/ogg"
                        onChange={handleVideoSelect}
                        className={styles.fileInput}
                        id="video-upload-new"
                      />
                      <label htmlFor="video-upload-new" className={styles.dropzoneLabel} style={{ cursor: 'pointer' }}>
                        <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                        <span>Click to Upload or Drag &amp; Drop Property Video</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          MP4, WebM, MOV formats (Max 50MB)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className={styles.fileList}>
                      <div className={styles.fileItem} style={{ background: '#f8fafc', border: '1px solid var(--color-neutral-200)' }}>
                        <div className={styles.fileInfo}>
                          <Video size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <div>
                            <span className={styles.fileName} style={{ fontWeight: 600 }}>{selectedVideo.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                              {(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className={styles.fileProgress}>
                            {loading && !selectedVideo.uploaded ? (
                              <div className={styles.progressBar} style={{ width: `${selectedVideo.progress}%` }} />
                            ) : (
                              <span className={styles.successText}>
                                <Check size={14} /> {selectedVideo.uploaded ? 'Uploaded' : 'Ready to upload'}
                              </span>
                            )}
                          </div>
                          {!loading && (
                            <button
                              type="button"
                              onClick={removeVideo}
                              aria-label="Remove video"
                              title="Remove video"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedVideo.previewUrl && (
                        <div className={styles.videoPreviewBox}>
                          <video
                            src={selectedVideo.previewUrl}
                            controls
                            className={styles.videoPreviewPlayer}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Upload a video tour recorded on your phone or camera to attract 3x more buyer inquiries.
                  </span>
                </>
              ) : (
                <>
                  <Input
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleInputChange}
                    placeholder="Paste YouTube, Vimeo, or direct video URL (e.g. https://www.youtube.com/watch?v=...)"
                    leftIcon={<Video size={16} />}
                    fullWidth
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                    Embed an existing video walkthrough. Supports YouTube, Vimeo, and direct video streaming links.
                  </span>
                </>
              )}
            </div>

            {/* Document upload section */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Ownership Documents (Optional — Private)</label>
              <div className={styles.dropzone} {...dropHandlers(addDocFiles)}>
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
                  {selectedDocs.map((doc, index) => (
                    <div key={doc.id} className={styles.fileItem}>
                      <div className={styles.fileInfo}>
                        <FileText size={16} />
                        <span className={styles.fileName}>{doc.name}</span>
                        <label htmlFor={`doc-type-${doc.id}`} className="visually-hidden">
                          Document type for {doc.name}
                        </label>
                        <select
                          id={`doc-type-${doc.id}`}
                          value={doc.docType || 'OTHER'}
                          disabled={loading && !doc.uploaded}
                          onChange={(e) =>
                            setSelectedDocs((prev) =>
                              prev.map((d) => (d.id === doc.id ? { ...d, docType: e.target.value } : d))
                            )
                          }
                          style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '6px', border: '1px solid var(--color-border)', maxWidth: '11rem' }}
                        >
                          {DOCUMENT_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className={styles.fileProgress}>
                          {loading && !doc.uploaded ? (
                            <div className={styles.progressBar} style={{ width: `${doc.progress}%` }} />
                          ) : (
                            <span className={styles.successText}><Check size={14} /> {doc.uploaded ? 'Uploaded' : 'Ready'}</span>
                          )}
                        </div>
                        {!loading && (
                          <button
                            type="button"
                            onClick={() => removeDoc(index)}
                            aria-label="Remove document"
                            title="Remove document"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: 'var(--radius-sm)',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                          >
                            <X size={16} />
                          </button>
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
              disabled={selectedPhotos.some((p) => !p.completed) || selectedDocs.some((d) => !d.completed)} 
              style={{ marginLeft: 'auto' }}
            >
              Submit Property
            </Button>
          )}
        </div>
      </Card>

      <PhoneVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        onSuccess={async () => {
          await refreshProfile();
          setVerifyModalOpen(false);
          showToast('Success', 'Your phone number has been verified! You can now proceed with your listing.', 'success');
        }}
        initialPhone={typeof window !== 'undefined' ? window.sessionStorage.getItem('onboarding_phone') || profile?.phone || '' : profile?.phone || ''}
      />
    </div>
  );
}
