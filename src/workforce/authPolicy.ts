export const isValidWorkforcePin = (pin: string) => {
  if (!/^\d{6}$/.test(pin)) return false;
  if (/^(\d)\1{5}$/.test(pin)) return false;

  const ascending = "0123456789";
  const descending = "9876543210";
  return !ascending.includes(pin) && !descending.includes(pin);
};

