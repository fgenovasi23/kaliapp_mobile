import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  content: { padding: 18, paddingTop: 12 },
  muted: { color: '#7f6c61', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { color: '#4b3a34', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  appointmentCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eddfd7', borderRadius: 10, padding: 16, marginBottom: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardEyebrow: { color: '#9a705a', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  cardDate: { color: '#69574f', fontSize: 12 },
  cardTitle: { color: '#453931', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardBody: { color: '#6d5a53', fontSize: 14, marginBottom: 2 },
  cancel: { color: '#a14e46', fontWeight: '700', marginTop: 10 },
});