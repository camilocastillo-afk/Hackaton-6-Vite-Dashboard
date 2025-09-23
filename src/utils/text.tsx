export default function capitalizeFirstLetter(string) {
  if (typeof string !== 'string' || string.length === 0) {
    return string; // Handle non-string inputs or empty strings
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}