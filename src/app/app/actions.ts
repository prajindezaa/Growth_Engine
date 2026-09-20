'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createBusiness(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const gstin = formData.get('gstin') as string
  const currency = (formData.get('currency') as string) || 'INR'
  const invoice_prefix = (formData.get('invoice_prefix') as string) || 'INV'
  const financial_year_start = parseInt(
    (formData.get('financial_year_start') as string) || '4',
    10
  )
  const number_format = (formData.get('number_format') as string) || 'en-IN'

  const tax_config = {
    gst_rate: parseFloat((formData.get('gst_rate') as string) || '18'),
    cess_rate: parseFloat((formData.get('cess_rate') as string) || '0'),
    hsn_default: (formData.get('hsn_default') as string) || '',
    tax_inclusive: formData.get('tax_inclusive') === 'true',
  }

  // Insert business
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      gstin: gstin || null,
      currency,
      tax_config,
      invoice_prefix,
      financial_year_start,
      number_format,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (bizError) {
    return { error: bizError.message }
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('business_members')
    .insert({
      business_id: business.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    return { error: memberError.message }
  }

  redirect(`/app/${business.id}`)
}

export async function updateBusiness(businessId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const gstin = formData.get('gstin') as string
  const currency = (formData.get('currency') as string) || 'INR'
  const invoice_prefix = (formData.get('invoice_prefix') as string) || 'INV'
  const financial_year_start = parseInt(
    (formData.get('financial_year_start') as string) || '4',
    10
  )
  const number_format = (formData.get('number_format') as string) || 'en-IN'

  const tax_config = {
    gst_rate: parseFloat((formData.get('gst_rate') as string) || '18'),
    cess_rate: parseFloat((formData.get('cess_rate') as string) || '0'),
    hsn_default: (formData.get('hsn_default') as string) || '',
    tax_inclusive: formData.get('tax_inclusive') === 'true',
  }

  const payment_settings = {
    bank_name: (formData.get('bank_name') as string) || undefined,
    account_number: (formData.get('account_number') as string) || undefined,
    ifsc_code: (formData.get('ifsc_code') as string) || undefined,
    upi_id: (formData.get('upi_id') as string) || undefined,
    payment_terms_days: formData.get('payment_terms_days')
      ? parseInt(formData.get('payment_terms_days') as string, 10)
      : undefined,
  }

  // Clean undefined values
  const cleanPaymentSettings = Object.fromEntries(
    Object.entries(payment_settings).filter(([, v]) => v !== undefined)
  )

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      gstin: gstin || null,
      currency,
      tax_config,
      invoice_prefix,
      financial_year_start,
      number_format,
      payment_settings: cleanPaymentSettings,
    })
    .eq('id', businessId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function uploadBusinessLogo(businessId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('logo') as File
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Use JPEG, PNG, WebP, or SVG.' }
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 2MB.' }
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${businessId}/logo.${fileExt}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('business-logos')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('business-logos').getPublicUrl(filePath)

  // Update business logo_url
  const { error: updateError } = await supabase
    .from('businesses')
    .update({ logo_url: publicUrl })
    .eq('id', businessId)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true, logo_url: publicUrl }
}

export async function deleteBusinessLogo(businessId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get current logo_url to determine the file path
  const { data: business } = await supabase
    .from('businesses')
    .select('logo_url')
    .eq('id', businessId)
    .single()

  if (business?.logo_url) {
    // Extract file path from URL
    const url = new URL(business.logo_url)
    const pathParts = url.pathname.split('/business-logos/')
    if (pathParts[1]) {
      await supabase.storage
        .from('business-logos')
        .remove([pathParts[1]])
    }
  }

  // Clear logo_url
  const { error } = await supabase
    .from('businesses')
    .update({ logo_url: null })
    .eq('id', businessId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
