 import { useState, useEffect } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Clock, AlertTriangle, Users } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 
 interface ExpiringUser {
   id: string;
   plan: string;
   days_remaining: number;
   plan_expires_at: string;
 }
 
 export const ExpiringProUsersWidget = () => {
   const [expiringUsers, setExpiringUsers] = useState<ExpiringUser[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchExpiringUsers = async () => {
       try {
         const sevenDaysFromNow = new Date();
         sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
         
         const { data, error } = await supabase
           .from('subscriptions')
           .select('id, plan, plan_expires_at')
           .in('plan', ['pro', 'proplus'])
           .not('plan_expires_at', 'is', null)
           .lte('plan_expires_at', sevenDaysFromNow.toISOString())
           .gte('plan_expires_at', new Date().toISOString())
           .order('plan_expires_at', { ascending: true });
 
         if (error) throw error;
 
         const usersWithDays = (data || []).map(sub => ({
           id: sub.id,
           plan: sub.plan,
           plan_expires_at: sub.plan_expires_at!,
           days_remaining: Math.ceil(
             (new Date(sub.plan_expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
           )
         }));
 
         setExpiringUsers(usersWithDays);
       } catch (error) {
         console.error('Error fetching expiring users:', error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchExpiringUsers();
   }, []);
 
   const getDaysLabel = (days: number) => {
     if (days <= 0) return 'Today';
     if (days === 1) return '1 day';
     return `${days} days`;
   };
 
   const getUrgencyColor = (days: number) => {
     if (days <= 1) return 'text-destructive';
     if (days <= 3) return 'text-warning';
     return 'text-muted-foreground';
   };
 
   if (loading) {
     return (
       <Card>
         <CardHeader className="pb-4">
           <CardTitle className="flex items-center gap-2 text-lg">
             <Clock className="h-5 w-5 text-warning" />
             Expiring Pro Plans
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="animate-pulse space-y-3">
             <div className="h-10 bg-muted rounded" />
             <div className="h-10 bg-muted rounded" />
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card className={expiringUsers.length > 0 ? 'border-warning/30' : ''}>
       <CardHeader className="pb-4">
         <CardTitle className="flex items-center justify-between text-lg">
           <span className="flex items-center gap-2">
             <Clock className="h-5 w-5 text-warning" />
             Expiring Pro Plans
           </span>
           {expiringUsers.length > 0 && (
             <Badge variant="outline" className="border-warning text-warning">
               {expiringUsers.length} user{expiringUsers.length !== 1 ? 's' : ''}
             </Badge>
           )}
         </CardTitle>
         <CardDescription>Pro subscriptions expiring within 7 days</CardDescription>
       </CardHeader>
       <CardContent>
         {expiringUsers.length === 0 ? (
           <div className="flex items-center justify-center py-6 text-muted-foreground">
             <Users className="h-5 w-5 mr-2" />
             <span>No expiring subscriptions</span>
           </div>
         ) : (
           <div className="space-y-2 max-h-[200px] overflow-y-auto">
             {expiringUsers.map((user) => (
               <div
                 key={user.id}
                 className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
               >
                 <div className="flex items-center gap-3">
                   {user.days_remaining <= 1 && (
                     <AlertTriangle className="h-4 w-4 text-destructive" />
                   )}
                   <Badge variant="secondary" className="capitalize">
                     {user.plan}
                   </Badge>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className={`text-sm font-medium ${getUrgencyColor(user.days_remaining)}`}>
                     {getDaysLabel(user.days_remaining)}
                   </span>
                 </div>
               </div>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };