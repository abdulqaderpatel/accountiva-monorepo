<script setup lang="ts">
import { ref, watch } from 'vue';
import { Landmark, CreditCard, Wallet, Loader2 } from 'lucide-vue-next';
import Modal from '@/components/Modal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'vue-sonner';
import { useBankingStore, type BankAccount } from '@/stores/bankingStore';

const props = defineProps<{
  open: boolean;
  account?: BankAccount | null;
}>();

const emit = defineEmits(['close', 'saved']);

const bankingStore = useBankingStore();
const isSubmitting = ref(false);

const form = ref({
  account_name: '',
  account_code: '',
  account_type: 'bank' as 'bank' | 'credit_card' | 'cash',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  currency: 'INR',
  opening_balance: 0,
  description: '',
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.account) {
        form.value = {
          account_name: props.account.account_name,
          account_code: props.account.account_code || '',
          account_type: props.account.account_type,
          bank_name: props.account.bank_name || '',
          account_number: props.account.account_number || '',
          ifsc_code: props.account.ifsc_code || '',
          currency: props.account.currency || 'INR',
          opening_balance: Number(props.account.opening_balance) || 0,
          description: props.account.description || '',
        };
      } else {
        form.value = {
          account_name: '',
          account_code: '',
          account_type: 'bank',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          currency: 'INR',
          opening_balance: 0,
          description: '',
        };
      }
    }
  },
  { immediate: true }
);

const handleSubmit = async () => {
  if (!form.value.account_name.trim()) {
    toast.error('Account name is required');
    return;
  }

  form.value.currency = /^[A-Za-z]{3}$/.test(form.value.currency?.trim() || '')
    ? form.value.currency.trim().toUpperCase()
    : 'INR';

  isSubmitting.value = true;
  try {
    if (props.account) {
      await bankingStore.updateAccount(props.account.id, form.value);
      toast.success('Account updated successfully');
    } else {
      await bankingStore.createAccount(form.value);
      toast.success('Account created successfully');
    }
    emit('saved');
    emit('close');
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to save account');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal
    :open="open"
    :title="account ? 'Edit Account' : 'Add Bank or Credit Card'"
    description="Configure banking and card accounts for automatic transaction reconciliation and ledger tracking."
    maxWidthClass="max-w-lg"
    @close="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Account Type Segmented Control -->
      <div class="space-y-1.5">
        <Label class="text-xs font-semibold text-foreground">Account Type</Label>
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            @click="form.account_type = 'bank'"
            :class="[
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
              form.account_type === 'bank'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            ]"
          >
            <Landmark class="w-4 h-4" />
            <span>Bank Account</span>
          </button>

          <button
            type="button"
            @click="form.account_type = 'credit_card'"
            :class="[
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
              form.account_type === 'credit_card'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            ]"
          >
            <CreditCard class="w-4 h-4" />
            <span>Credit Card</span>
          </button>

          <button
            type="button"
            @click="form.account_type = 'cash'"
            :class="[
              'flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer',
              form.account_type === 'cash'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            ]"
          >
            <Wallet class="w-4 h-4" />
            <span>Cash</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Account Name -->
        <div class="sm:col-span-2 space-y-1.5">
          <Label for="acc-name" class="text-xs font-semibold text-foreground">
            Account Name <span class="text-destructive">*</span>
          </Label>
          <Input
            id="acc-name"
            v-model="form.account_name"
            placeholder="e.g. HDFC Bank - Current A/C"
            required
            class="h-9 text-xs"
          />
        </div>

        <!-- Account Code -->
        <div class="space-y-1.5">
          <Label for="acc-code" class="text-xs font-semibold text-foreground">Account Code</Label>
          <Input
            id="acc-code"
            v-model="form.account_code"
            placeholder="e.g. 1001"
            class="h-9 text-xs font-mono"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" v-if="form.account_type !== 'cash'">
        <!-- Bank Name -->
        <div class="space-y-1.5">
          <Label for="bank-name" class="text-xs font-semibold text-foreground">Bank Name</Label>
          <Input
            id="bank-name"
            v-model="form.bank_name"
            placeholder="e.g. HDFC Bank, Chase, SBI"
            class="h-9 text-xs"
          />
        </div>

        <!-- Account Number -->
        <div class="space-y-1.5">
          <Label for="acc-num" class="text-xs font-semibold text-foreground">Account / Card Number</Label>
          <Input
            id="acc-num"
            v-model="form.account_number"
            placeholder="e.g. 50200012345678"
            class="h-9 text-xs font-mono"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- IFSC / Routing Number -->
        <div class="space-y-1.5" v-if="form.account_type !== 'cash'">
          <Label for="ifsc-code" class="text-xs font-semibold text-foreground">IFSC / Routing Code</Label>
          <Input
            id="ifsc-code"
            v-model="form.ifsc_code"
            placeholder="e.g. HDFC0001234"
            class="h-9 text-xs uppercase font-mono"
          />
        </div>

        <!-- Currency -->
        <div class="space-y-1.5">
          <Label for="currency" class="text-xs font-semibold text-foreground">Currency</Label>
          <select
            id="currency"
            v-model="form.currency"
            class="w-full h-9 rounded-md border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-ring focus:outline-none uppercase font-mono"
          >
            <option value="INR">INR - Indian Rupee (₹)</option>
            <option value="USD">USD - US Dollar ($)</option>
            <option value="EUR">EUR - Euro (€)</option>
            <option value="GBP">GBP - British Pound (£)</option>
            <option value="AED">AED - UAE Dirham</option>
            <option value="SAR">SAR - Saudi Riyal</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="SGD">SGD - Singapore Dollar</option>
          </select>
        </div>

        <!-- Opening Balance -->
        <div class="space-y-1.5">
          <Label for="opening-balance" class="text-xs font-semibold text-foreground">Opening Balance</Label>
          <Input
            id="opening-balance"
            type="number"
            step="0.01"
            v-model.number="form.opening_balance"
            placeholder="0.00"
            class="h-9 text-xs font-mono"
          />
        </div>
      </div>

      <!-- Description / Notes -->
      <div class="space-y-1.5">
        <Label for="acc-desc" class="text-xs font-semibold text-foreground">Description (Optional)</Label>
        <Textarea
          id="acc-desc"
          v-model="form.description"
          placeholder="Notes about this bank account..."
          rows="2"
          class="text-xs resize-none"
        />
      </div>

      <!-- Action Footer -->
      <div class="pt-3 flex items-center justify-end gap-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-9 text-xs"
          @click="emit('close')"
          :disabled="isSubmitting"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          class="h-9 text-xs min-w-[100px]"
          :disabled="isSubmitting"
        >
          <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin mr-1.5" />
          {{ account ? 'Save Changes' : 'Save Account' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
