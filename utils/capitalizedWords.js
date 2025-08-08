const capitalizedWords = (text) => {
  if (!text) return;
  const words = text.split(" ");
  const capitalized = words.map((word) => {
    const firstChar = word.charAt(0).toUpperCase();
    const rest = word.slice(1);
    return firstChar + rest;
  });
  return capitalized.join(" ");
};

module.exports = capitalizedWords;
