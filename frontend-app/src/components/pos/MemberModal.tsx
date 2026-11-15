import React, { useState, useEffect } from 'react'
import { X, Search, UserCheck, Loader2, Award } from 'lucide-react'
import type { Member } from '@/types/member'
import { fetchMembers } from '@/services/api'

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
}) => {
  const [search, setSearch] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const loadMembers = async (q = '') => {
    setIsLoading(true)
    try {
      const data = await fetchMembers(q)
      setMembers(data || [])
    } catch (err) {
      console.warn('Failed to load members:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      setSearch('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadMembers(search)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-rose-200" />
            <div>
              <h3 className="font-extrabold text-sm">Pilih Member Pelanggan</h3>
              <p className="text-xs text-rose-200">Cari nomor telepon, nama, atau ID member</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                loadMembers(e.target.value)
              }}
              placeholder="Ketik nama atau nomor HP (Contoh: 0812...)"
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#8b1538]"
              autoFocus
            />
          </form>
        </div>

        {/* Members List */}
        <div className="p-3 overflow-y-auto max-h-[50vh] divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1 text-slate-400" />
              <p className="text-xs">Mencari data member...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs font-medium">Member tidak ditemukan</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Daftarkan member baru di menu Backoffice Admin</p>
            </div>
          ) : (
            members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMember(m)
                  onClose()
                }}
                className="w-full p-3 text-left hover:bg-rose-50/60 rounded-xl transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 group-hover:text-[#8b1538]">
                      {m.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      {m.tier}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {m.phone} • #{m.member_id}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{m.points} Poin</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
          >
            Batal (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
