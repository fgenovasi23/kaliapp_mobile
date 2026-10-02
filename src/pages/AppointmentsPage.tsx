import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { apiFetch } from '../api';
import type { Appointment } from '../types';
import showError from '../utils/showError';
import styles from './AppointmentsPage.styles';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function AppointmentsPage({ appointments, reload }: { appointments: Appointment[]; reload: () => void }) {
  const [clock, setClock] = useState(Date.now);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const nextStart = appointments.reduce<number | null>((soonest, appointment) => {
      const start = new Date(appointment.start_at).getTime();
      return start > clock && (soonest === null || start < soonest) ? start : soonest;
    }, null);

    if (nextStart === null) return;

    const timeoutId = setTimeout(() => setClock(Date.now()), Math.max(1, nextStart - clock + 1));
    return () => clearTimeout(timeoutId);
  }, [appointments, clock]);

  const now = new Date(clock);
  const historyCutoff = new Date(now);
  const originalDay = historyCutoff.getDate();
  historyCutoff.setDate(1);
  historyCutoff.setMonth(historyCutoff.getMonth() - 3);
  historyCutoff.setDate(Math.min(originalDay, new Date(historyCutoff.getFullYear(), historyCutoff.getMonth() + 1, 0).getDate()));
  const upcoming = appointments.filter((appointment) => new Date(appointment.start_at).getTime() > clock);
  const recent = appointments
    .filter((appointment) => {
      const start = new Date(appointment.start_at).getTime();
      return start <= clock && start >= historyCutoff.getTime();
    })
    .sort((first, second) => second.start_at.localeCompare(first.start_at));

  const cancel = (appointment: Appointment) => Alert.alert(
    'Annullare?',
    `${appointment.center_name}, ${formatDateTime(appointment.start_at)}`,
    [
      { text: 'Mantieni', style: 'cancel' },
      {
        text: 'Annulla appuntamento',
        style: 'destructive',
        onPress: () => apiFetch(`/api/mobile/appointments/${appointment.id}`, { method: 'DELETE' }).then(reload).catch(showError),
      },
    ],
  );

  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.sectionTitle}>Prossimi appuntamenti</Text>
    {upcoming.length === 0
      ? <View style={styles.empty}><Text style={styles.muted}>Non hai prenotazioni future.</Text></View>
      : upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onCancel={() => cancel(appointment)} />)}

    <Pressable
      style={styles.historyToggle}
      onPress={() => setShowHistory((visible) => !visible)}
      accessibilityRole="button"
      accessibilityState={{ expanded: showHistory }}
    >
      <Text style={styles.historyToggleText}>Storico ultimi 3 mesi ({recent.length})</Text>
      <Text style={styles.historyToggleText}>{showHistory ? '−' : '+'}</Text>
    </Pressable>
    {showHistory && (recent.length === 0
      ? <View style={styles.empty}><Text style={styles.muted}>Nessun appuntamento negli ultimi 3 mesi.</Text></View>
      : recent.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />))}
  </ScrollView>;
}

function AppointmentCard({ appointment, onCancel }: { appointment: Appointment; onCancel?: () => void }) {
  return <View style={styles.appointmentCard}>
    <View style={styles.statusRow}>
      <Text style={styles.cardEyebrow}>{appointment.status === 'CONFIRMED' ? 'CONFERMATO' : 'PRENOTATO'}</Text>
      <Text style={styles.cardDate}>{formatDateTime(appointment.start_at)}</Text>
    </View>
    <Text style={styles.cardTitle}>{appointment.center_name}</Text>
    <Text style={styles.cardBody}>{appointment.services.join(', ')}</Text>
    <Text style={styles.cardBody}>con {appointment.beautician_name}</Text>
    {onCancel && <Pressable onPress={onCancel}><Text style={styles.cancel}>Annulla prenotazione</Text></Pressable>}
  </View>;
}