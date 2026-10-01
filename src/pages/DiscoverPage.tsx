import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { apiFetch } from '../api';
import type { Beautician, BookingDraft, Center, Service } from '../types';
import showError from '../utils/showError';
import styles from './DiscoverPage.styles';

const emptyDraft: BookingDraft = { center: null, services: [], beautician: null, date: null, time: null };
const dates = Array.from({ length: 30 }, (_, index) => {
  const value = new Date();
  value.setDate(value.getDate() + index + 1);
  return value.toISOString().slice(0, 10);
});

const formatDate = (value: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
const money = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

export default function DiscoverPage({ onBooked }: { onBooked: () => void }) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [services, setServices] = useState<Service[]>([]);
  const [beauticians, setBeauticians] = useState<Beautician[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Center[]>('/api/mobile/centers').then(setCenters).catch(showError).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!draft.center) return;
    setServices([]);
    setBeauticians([]);
    setSlots([]);
    Promise.all([
      apiFetch<Service[]>(`/api/mobile/centers/${draft.center.id}/services`),
      apiFetch<Beautician[]>(`/api/mobile/centers/${draft.center.id}/beauticians`),
    ]).then(([nextServices, nextBeauticians]) => {
      setServices(nextServices);
      setBeauticians(nextBeauticians);
    }).catch(showError);
  }, [draft.center?.id]);

  useEffect(() => {
    if (!draft.center || !draft.beautician || !draft.date || draft.services.length === 0) return;
    apiFetch<{ available_slots: string[] }>('/api/mobile/availability/slots', {
      method: 'POST',
      body: JSON.stringify({
        center_id: draft.center.id,
        beautician_id: draft.beautician.id,
        service_ids: draft.services.map((service) => service.id),
        start_at: `${draft.date}T12:00:00`,
      }),
    }).then((result) => setSlots(result.available_slots.map((slot) => slot.slice(11, 16)))).catch(showError);
  }, [draft.center?.id, draft.beautician?.id, draft.date, draft.services.map((service) => service.id).join(',')]);

  const selectCenter = (center: Center) => setDraft({ ...emptyDraft, center });
  const toggleService = (service: Service) => setDraft((current) => ({
    ...current,
    services: current.services.some((item) => item.id === service.id)
      ? current.services.filter((item) => item.id !== service.id)
      : [...current.services, service],
    time: null,
  }));

  const book = async () => {
    if (!draft.center || !draft.beautician || !draft.date || !draft.time || draft.services.length === 0) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/mobile/appointments', {
        method: 'POST',
        body: JSON.stringify({
          center_id: draft.center.id,
          beautician_id: draft.beautician.id,
          service_ids: draft.services.map((service) => service.id),
          start_at: `${draft.date}T${draft.time}:00`,
        }),
      });
      Alert.alert('Prenotazione confermata', 'Trovi i dettagli nella sezione I miei.');
      setDraft(emptyDraft);
      onBooked();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const total = draft.services.reduce((sum, service) => sum + Number(service.price), 0);

  return <ScrollView contentContainerStyle={styles.content}>
    {loading ? <ActivityIndicator color="#9f7b64" /> : <>
      <SectionTitle number="01" title="Scegli il centro" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
        {centers.map((center) => <Choice key={center.id} active={draft.center?.id === center.id} title={center.name} subtitle={center.address || 'Scopri il centro'} onPress={() => selectCenter(center)} />)}
      </ScrollView>
      {draft.center && <>
        <SectionTitle number="02" title="Scegli i servizi" />
        <View style={styles.choiceGrid}>
          {services.map((service) => <Choice key={service.id} active={draft.services.some((item) => item.id === service.id)} title={service.name} subtitle={`${service.duration_minutes} min Â· ${money(Number(service.price))}`} onPress={() => toggleService(service)} />)}
        </View>
        <SectionTitle number="03" title="Scegli l'estetista" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {beauticians.map((beautician) => <Choice key={beautician.id} active={draft.beautician?.id === beautician.id} title={`${beautician.first_name} ${beautician.last_name}`} subtitle="Estetista" onPress={() => setDraft({ ...draft, beautician, time: null })} />)}
        </ScrollView>
      </>}
      {draft.beautician && draft.services.length > 0 && <>
        <SectionTitle number="04" title="Scegli il giorno" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {dates.map((date) => <Pressable key={date} style={[styles.dateChip, draft.date === date && styles.dateChipActive]} onPress={() => setDraft({ ...draft, date, time: null })}>
            <Text style={[styles.dateChipText, draft.date === date && styles.dateChipTextActive]}>{formatDate(date)}</Text>
          </Pressable>)}
        </ScrollView>
      </>}
      {draft.date && <>
        <SectionTitle number="05" title="Scegli l'orario" />
        <View style={styles.times}>
          {slots.length === 0 ? <Text style={styles.muted}>Nessun orario disponibile per questo giorno.</Text> : slots.map((time) => <Pressable key={time} style={[styles.timeChip, draft.time === time && styles.timeChipActive]} onPress={() => setDraft({ ...draft, time })}>
            <Text style={draft.time === time ? styles.timeChipTextActive : styles.timeChipText}>{time}</Text>
          </Pressable>)}
        </View>
      </>}
      {draft.time && <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{draft.center?.name}</Text>
        <Text style={styles.summaryText}>{draft.services.map((service) => service.name).join(' Â· ')}</Text>
        <Text style={styles.summaryText}>{formatDate(draft.date!)} alle {draft.time} Â· {money(total)}</Text>
        <Pressable style={styles.primaryButton} onPress={book} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Conferma in corso...' : 'Conferma prenotazione'}</Text>
        </Pressable>
      </View>}
    </>}
  </ScrollView>;
}

function Choice({ active, title, subtitle, onPress }: { active: boolean; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
    <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>{title}</Text>
    <Text style={[styles.choiceSubtitle, active && styles.choiceSubtitleActive]}>{subtitle}</Text>
  </Pressable>;
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionNumber}>{number}</Text><Text style={styles.sectionText}>{title}</Text></View>;
}