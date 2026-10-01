import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { apiFetch } from '../api';
import type { Appointment } from '../types';
import showError from '../utils/showError';
import styles from './AppointmentsPage.styles';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function AppointmentsPage({ appointments, reload }: { appointments: Appointment[]; reload: () => void }) {
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
    {appointments.length === 0
      ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nessun appuntamento</Text><Text style={styles.muted}>Quando prenoterai, i dettagli compariranno qui.</Text></View>
      : appointments.map((appointment) => <View key={appointment.id} style={styles.appointmentCard}>
        <View style={styles.statusRow}>
          <Text style={styles.cardEyebrow}>{appointment.status === 'CONFIRMED' ? 'CONFERMATO' : 'PRENOTATO'}</Text>
          <Text style={styles.cardDate}>{formatDateTime(appointment.start_at)}</Text>
        </View>
        <Text style={styles.cardTitle}>{appointment.center_name}</Text>
        <Text style={styles.cardBody}>{appointment.services.join(' Â· ')}</Text>
        <Text style={styles.cardBody}>con {appointment.beautician_name}</Text>
        {new Date(appointment.start_at) > new Date() && <Pressable onPress={() => cancel(appointment)}><Text style={styles.cancel}>Annulla prenotazione</Text></Pressable>}
      </View>)}
  </ScrollView>;
}