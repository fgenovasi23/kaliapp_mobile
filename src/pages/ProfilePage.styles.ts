import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  content: { padding: 18, paddingTop: 12 },
  profileCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#efe2d8', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0e0d6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#6c4d3d', fontSize: 22, fontWeight: '700' },
  profileName: { color: '#44332d', fontSize: 24, fontWeight: '700', marginBottom: 6 },
  muted: { color: '#7f6c61', fontSize: 14 },
  serverBox: { padding: 16, marginTop: 18, backgroundColor: '#f8f0eb', borderRadius: 6 },
  fieldLabel: { color: '#9a7a67', fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 7 },
  input: { borderBottomWidth: 1, borderColor: '#d8c5ba', color: '#3f352f', fontSize: 16, paddingVertical: 9 },
  textButton: { marginTop: 10 },
  textButtonLabel: { color: '#75523f', fontWeight: '700', fontSize: 14 },
  logoutButton: { marginTop: 18, borderWidth: 1, borderColor: '#d9a89e', backgroundColor: '#fff2ef', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#9a4c41', fontWeight: '700', fontSize: 15 },
});