import api from '@/utils/api'

export interface IStatus {
  is_bridge: boolean
  is_tweet: boolean
  is_claim: boolean
  is_claim_success: boolean
  txHash?: string
}

export const getActivityStatus = async (address: string): Promise<IStatus> => {
	const res = await api.get(`/api/gift/status/${address}`)
	return res.data as IStatus
}

export const claimActivity = async (address: string) => {
	return await api.get(`/api/gift/claim/${address}`)
}

export interface IAddressInfo {
  hash: string;
  implementation_name?: string;
  name?: string;
  ens_domain_name?: string;
  is_contract?: boolean;
  is_verified?: boolean;
  metadata?: any;
  private_tags?: Array<{
    address_hash: string;
    display_name: string;
    label: string;
  }>;
  watchlist_names?: Array<{
    display_name: string;
    label: string;
  }>;
  public_tags?: Array<{
    address_hash: string;
    display_name: string;
    label: string;
  }>;
}

export interface ITokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: string;
  type: string;
  icon_url?: string;
  circulating_market_cap?: string;
  holders?: string;
  exchange_rate?: string;
  total_supply?: string;
}

export interface ITokenTransfer {
  block_hash?: string;
  from: IAddressInfo;
  to: IAddressInfo;
  token: ITokenInfo;
  total: {
    value: string;
    decimals: string;
  };
  log_index?: number;
  method?: string;
  timestamp?: string;
  transaction_hash?: string;
  type?: string;
}

export interface IAction {
  protocol: string;
  type: string;
  data: any;
}

export interface IDecodedInput {
  method_call: string;
  method_id: string;
  parameters: Array<{
    name: string;
    type: string;
    value: string;
  }>;
}

export interface ITransactionItem {
  hash: string;
  timestamp: string;
  from: IAddressInfo;
  to: IAddressInfo;
  value: string;
  gas_limit: number;
  gas_used: string;
  gas_price: string;
  method?: string;
  status: string;
  block_number: number;
  fee?: {
    type: string;
    value: string;
  };
  type?: number;
  exchange_rate?: string;
  transaction_burnt_fee?: string;
  max_fee_per_gas?: string;
  result?: string;
  priority_fee?: string;
  base_fee_per_gas?: string;
  token_transfers?: ITokenTransfer[];
  transaction_types?: string[];
  created_contract?: IAddressInfo;
  position?: number;
  nonce?: number;
  has_error_in_internal_transactions?: boolean;
  actions?: IAction[];
  decoded_input?: IDecodedInput;
  token_transfers_overflow?: boolean;
  raw_input?: string;
  max_priority_fee_per_gas?: string;
  revert_reason?: string;
  confirmation_duration?: number[];
  transaction_tag?: string;
}

export interface ITransactionResponse {
  items: ITransactionItem[];
  next_page_params: {
    block_number: number;
    index: number;
    items_count: number;
  } | null;
}

// Fetch transaction history from HashKey Blockscout API
export const getTransactionHistory = async (address: string, page?: number): Promise<ITransactionResponse> => {
  try {
    const baseUrl = 'https://hashkey.blockscout.com/api/v2';
    const params = new URLSearchParams();
    if (page) {
      params.append('page', page.toString());
    }
    params.append('filter', 'to|from');
    
    const url = `${baseUrl}/addresses/${address}/transactions?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    throw error;
  }
};