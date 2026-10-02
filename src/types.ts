export type Center = { id: number; name: string; address: string; phone: string; email: string };
export type Service = { id: number; name: string; duration_minutes: number; price: number };
export type Beautician = { id: number; first_name: string; last_name: string };
export type Profile = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string | null;
  tax_code: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  has_profile_photo: boolean;
};
export type Appointment = {
  id: number;
  center_name: string;
  beautician_name: string;
  start_at: string;
  end_at: string;
  status: 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NOSHOW';
  services: string[];
};

export type BookingDraft = {
  center: Center | null;
  services: Service[];
  beautician: Beautician | null;
  date: string | null;
  time: string | null;
};