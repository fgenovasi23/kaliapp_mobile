import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch, apiFetchBlob, getApiUrl, saveApiUrl } from '../api';
import type { Profile } from '../types';
import showError from '../utils/showError';
import styles from './ProfilePage.styles';

export default function ProfilePage({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [savedPhotoUri, setSavedPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    apiFetch<Profile>('/api/mobile/me').then((data) => {
      const normalized = normalizeProfile(data);
      setProfile(normalized);
      setSavedProfile(normalized);
    }).catch(showError);
    getApiUrl().then(setApiUrl);
  }, []);

  useEffect(() => {
    if (!profile?.has_profile_photo) {
      setPhotoUri(null);
      setSavedPhotoUri(null);
      return;
    }
    let cancelled = false;
    apiFetchBlob('/api/mobile/me/profile-photo')
      .then(blobToDataUrl)
      .then((uri) => {
        if (!cancelled) {
          setPhotoUri(uri);
          setSavedPhotoUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) setPhotoUri(null);
      });
    return () => { cancelled = true; };
  }, [profile?.has_profile_photo]);

    useEffect(() => {
      if (!profileError) return;
      const timeoutId = setTimeout(() => setProfileError(''), 5000);
      return () => clearTimeout(timeoutId);
    }, [profileError]);

    useEffect(() => {
      if (!profileSuccess) return;
      const timeoutId = setTimeout(() => setProfileSuccess(''), 5000);
      return () => clearTimeout(timeoutId);
    }, [profileSuccess]);

  const updateField = (field: keyof Profile, value: string) => {
    setProfile((current) => current ? { ...current, [field]: value } : current);
  };

  const saveProfile = async () => {
    if (!profile || !profile.first_name.trim() || !profile.last_name.trim() || !profile.email.trim() || !profile.phone.trim()) {
      setProfileError('Nome, cognome, email e telefono sono obbligatori.');
      return;
    }
    setSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const contacts = await apiFetch<{ error: string | null }>('/api/mobile/me/profile/check-contacts', {
        method: 'POST',
        body: JSON.stringify({ email: profile.email.trim(), phone: profile.phone.trim() }),
      });
      if (contacts.error) {
        setProfileError(contacts.error);
        return;
      }

      const updated = await apiFetch<Profile>('/api/mobile/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...profile,
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          birth_date: profile.birth_date?.trim() || null,
          tax_code: profile.tax_code?.trim() || '',
          address: profile.address?.trim() || '',
          postal_code: profile.postal_code?.trim() || '',
          city: profile.city?.trim() || '',
          ...(photoBase64 ? { profile_photo_base64: photoBase64 } : {}),
        }),
      });
      const normalized = normalizeProfile(updated);
      setProfile(normalized);
      setSavedProfile(normalized);
      setSavedPhotoUri(photoUri);
      setPhotoBase64(null);
      setEditing(false);
      setProfileSuccess('Profilo aggiornato.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Impossibile aggiornare il profilo.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setProfile(savedProfile);
    setPhotoUri(savedPhotoUri);
    setPhotoBase64(null);
    setProfileError('');
    setProfileSuccess('');
    setEditing(false);
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileError('Consenti l’accesso alle foto per scegliere un’immagine.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setProfileError('Impossibile leggere l’immagine selezionata.');
      return;
    }
    setPhotoBase64(asset.base64);
    setPhotoUri(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
    setProfileError('');
  };

  const performDelete = () => {
    setDeleting(true);
    apiFetch('/api/mobile/me', { method: 'DELETE' })
      .then(onLogout)
      .catch((error) => {
        setProfileError(error instanceof Error ? error.message : 'Impossibile eliminare il profilo.');
        setDeleting(false);
      });
  };

  const deleteProfile = () => setShowDeleteConfirmation(true);

  const confirmDelete = () => {
    setShowDeleteConfirmation(false);
    performDelete();
  };

  return <>
    <ScrollView contentContainerStyle={styles.content}>
    {profile && <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{profile.first_name[0]}{profile.last_name[0]}</Text>}
        </View>
        <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
        {!editing && <Pressable
          style={styles.editIconButton}
          onPress={() => { setEditing(true); setProfileSuccess(''); setProfileError(''); }}
          accessibilityRole="button"
          accessibilityLabel="Modifica profilo"
        >
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>}
      </View>
      {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
      {profileSuccess ? <Text style={styles.success}>{profileSuccess}</Text> : null}
      <View style={styles.profileFields}>
        {editing && <Pressable style={styles.photoButton} onPress={choosePhoto}><Text style={styles.photoButtonText}>{photoUri ? 'Cambia foto profilo' : 'Aggiungi foto profilo'}</Text></Pressable>}
        {editing ? <>
          <ProfileField label="Nome" value={profile.first_name} keyboardType="default" onChangeText={(value) => updateField('first_name', value)} />
          <ProfileField label="Cognome" value={profile.last_name} keyboardType="default" onChangeText={(value) => updateField('last_name', value)} />
          <ProfileField label="Email" value={profile.email} keyboardType="email-address" onChangeText={(value) => updateField('email', value)} />
          <ProfileField label="Telefono" value={profile.phone} keyboardType="phone-pad" onChangeText={(value) => updateField('phone', value)} />
          <ProfileField label="Data di nascita" value={profile.birth_date ?? ''} placeholder="AAAA-MM-GG" keyboardType="default" onChangeText={(value) => updateField('birth_date', value)} />
          <ProfileField label="Codice fiscale" value={profile.tax_code ?? ''} keyboardType="default" onChangeText={(value) => updateField('tax_code', value)} />
          <ProfileField label="Indirizzo" value={profile.address ?? ''} keyboardType="default" onChangeText={(value) => updateField('address', value)} />
          <ProfileField label="CAP" value={profile.postal_code ?? ''} keyboardType="numeric" onChangeText={(value) => updateField('postal_code', value)} />
          <ProfileField label="Città" value={profile.city ?? ''} keyboardType="default" onChangeText={(value) => updateField('city', value)} />
        </> : <View style={styles.profileGrid}>
          <ProfileData label="Email" value={profile.email} wide />
          <ProfileData label="Telefono" value={profile.phone} />
          <ProfileData label="Data di nascita" value={profile.birth_date || '—'} />
          <ProfileData label="Codice fiscale" value={profile.tax_code || '—'} />
          <ProfileData label="Indirizzo" value={profile.address || '—'} wide />
          <ProfileData label="CAP" value={profile.postal_code || '—'} />
          <ProfileData label="Città" value={profile.city || '—'} />
        </View>}
      </View>
      {editing ? (
        <View style={styles.profileActions}>
          <Pressable style={styles.secondaryButton} onPress={cancelEditing} disabled={saving}><Text style={styles.secondaryButtonText}>Annulla</Text></Pressable>
          <Pressable style={styles.saveButton} onPress={saveProfile} disabled={saving}><Text style={styles.saveButtonText}>{saving ? 'Salvataggio...' : 'Salva modifiche'}</Text></Pressable>
        </View>
      ) : null}
      {editing && <Pressable style={styles.deleteButton} onPress={deleteProfile} disabled={deleting}>
        <Text style={styles.deleteText}>{deleting ? 'Eliminazione...' : 'Elimina profilo e appuntamenti'}</Text>
      </Pressable>}
    </View>}
    <View style={styles.serverBox}>
      <Text style={styles.fieldLabel}>INDIRIZZO BACKEND</Text>
      <TextInput style={styles.input} value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" />
      <Pressable style={styles.textButton} onPress={() => saveApiUrl(apiUrl).then(() => Alert.alert('Salvato', 'Il nuovo server sarÃ  usato per le prossime richieste.'))}>
        <Text style={styles.textButtonLabel}>Aggiorna server</Text>
      </Pressable>
    </View>
    <Pressable style={styles.logoutButton} onPress={() => { void onLogout(); }}>
      <Text style={styles.logoutText}>Esci dall'account</Text>
    </Pressable>
    </ScrollView>
    <Modal transparent visible={showDeleteConfirmation} animationType="fade" onRequestClose={() => setShowDeleteConfirmation(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.deleteDialog}>
          <Text style={styles.deleteDialogTitle}>Eliminare il profilo?</Text>
          <Text style={styles.deleteDialogMessage}>Il profilo cliente e tutti gli appuntamenti collegati verranno eliminati. L’operazione non si può annullare.</Text>
          <View style={styles.deleteDialogActions}>
            <Pressable style={styles.deleteCancelButton} onPress={() => setShowDeleteConfirmation(false)}>
              <Text style={styles.deleteCancelText}>Mantieni il profilo</Text>
            </Pressable>
            <Pressable style={styles.deleteConfirmButton} onPress={confirmDelete}>
              <Text style={styles.deleteConfirmText}>Elimina profilo</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    birth_date: profile.birth_date ?? null,
    tax_code: profile.tax_code ?? '',
    address: profile.address ?? '',
    postal_code: profile.postal_code ?? '',
    city: profile.city ?? '',
  };
}

function ProfileField({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  onChangeText: (value: string) => void;
}) {
  return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      onChangeText={onChangeText}
    />
  </View>;
}

  function ProfileData({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
    return <View style={[styles.profileData, wide && styles.profileDataWide]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>;
  }

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Formato foto non valido'));
    reader.onerror = () => reject(new Error('Impossibile caricare la foto profilo'));
    reader.readAsDataURL(blob);
  });
}