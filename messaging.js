const messageTemplate = "Dear [name],\n\nThe Wait is Finally Over️. This rerun represents a vote for courage. A vote for a candidate who ran when it mattered most on the 31st October 2025. \"You know my heart, you have seen my work. Let us build a better Strathmore not just for tomorrow but for generations to come!!\"\n\n#Alvin4president\n\n#the17th";

function generateLinks(validContacts) {
  const contactsWithLinks = [];
  validContacts.forEach(contact => {
    const personalizedMessage = messageTemplate.replace('[name]', contact.name);
    const encodedMessage = encodeURIComponent(personalizedMessage);
    const link = `https://wa.me/${contact.phone}?text=${encodedMessage}`;
    contactsWithLinks.push({ name: contact.name, telephone: contact.phone, link });
    console.log(`Generated link for ${contact.name}: ${link}`);
  });
  return contactsWithLinks;
}

module.exports = { generateLinks, messageTemplate };
