export const formatCurrency = (amount, currency = 'BDT') => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-BD').format(number);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'green',
    pending: 'orange',
    approved: 'blue',
    paid: 'green',
    rejected: 'red',
    suspended: 'volcano',
    completed: 'green',
    cancelled: 'default',
    expired: 'default',
    failed: 'red',
  };
  return colors[status] || 'default';
};
