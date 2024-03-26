export interface Donor {
  email: string;
}

export interface Contribution {
  createdAt: string;
  status: string;
  isRecurring: boolean;
}

export interface LineItem {
  amount: string;
}

export interface DonationData {
  donor: Donor;
  contribution: Contribution;
  lineitems: LineItem[];
}
