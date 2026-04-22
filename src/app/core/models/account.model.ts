export interface Account {
  id: string | number;
  name: string;
  type: string;
  balance: string;
  balanceLabel: string;
  details: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  badgeClass: string;
  color?: string;
  agencyNumber?: string;
  accountNumber?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiration?: string;
  cardCvv?: string;
}
