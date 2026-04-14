import { redirect } from 'next/navigation';

type Props = { params: { accountId: string } };

export default function SupplyAccountIndexPage({ params }: Props) {
  redirect(`/supply/${params.accountId}/dashboard`);
}
